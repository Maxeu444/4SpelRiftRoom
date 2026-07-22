import { analyzeDuoMatches, analyzeIndividualMatches, analyzeTeamMatches, findDuoMatches, findTeamMatches } from "./analytics";
import { saveTeamScan } from "./database";
import { getChampionNamesById } from "./data-dragon";
import { asRegionalRouting, getMatch, getMatchIds, getMatchTimeline, resolveRiotAccount } from "./riot";

const DEFAULT_MATCH_HISTORY_SIZE = 100;
const TEAM_MATCH_SAMPLE_SIZE = 40;
const DUO_MATCH_SAMPLE_SIZE = 30;
const TIMELINE_SAMPLE_SIZE = 8;
const INDIVIDUAL_MATCH_SAMPLE_SIZE = 10;

export type TeamSyncPlayer = { gameName: string; tagLine: string };
export type TeamSyncOptions = {
  players: TeamSyncPlayer[];
  regionalRouting?: string;
  minTeammates?: number;
  matchCount?: number;
};

function recentSharedMatchIds(matchLists: string[][], occurrences: Map<string, number>, minimumPlayers: number, limit: number) {
  const selected: string[] = [];
  const seen = new Set<string>();
  const longestList = Math.max(...matchLists.map((matchIds) => matchIds.length), 0);
  for (let index = 0; index < longestList && selected.length < limit; index += 1) {
    for (const matchIds of matchLists) {
      const matchId = matchIds[index];
      if (!matchId || seen.has(matchId) || (occurrences.get(matchId) ?? 0) < minimumPlayers) continue;
      seen.add(matchId);
      selected.push(matchId);
      if (selected.length === limit) break;
    }
  }
  return selected;
}

export async function synchronizeTeam(options: TeamSyncOptions) {
  const regionalRouting = asRegionalRouting(options.regionalRouting ?? process.env.RIOT_REGIONAL_ROUTING);
  const minTeammates = 3;
  const matchCount = Math.max(10, Math.min(options.matchCount ?? DEFAULT_MATCH_HISTORY_SIZE, 100));
  const accounts = await Promise.all(options.players.map((player) => resolveRiotAccount(regionalRouting, player.gameName.trim(), player.tagLine.trim())));
  const matchLists = await Promise.all(accounts.map((account) => getMatchIds(regionalRouting, account.puuid, matchCount)));

  const occurrences = new Map<string, number>();
  for (const ids of matchLists) {
    for (const id of new Set(ids)) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
  }
  const sharedMatchIds = recentSharedMatchIds(matchLists, occurrences, minTeammates, TEAM_MATCH_SAMPLE_SIZE);
  const duoCandidateIds = recentSharedMatchIds(matchLists, occurrences, 2, DUO_MATCH_SAMPLE_SIZE);
  const individualMatchIds = matchLists.flatMap((matchIds) => matchIds.slice(0, INDIVIDUAL_MATCH_SAMPLE_SIZE));
  const rawMatchIds = [...new Set([...sharedMatchIds, ...duoCandidateIds, ...individualMatchIds])];
  const rawMatches = await Promise.all(rawMatchIds.map((matchId) => getMatch(regionalRouting, matchId)));
  const rawMatchesById = new Map(rawMatches.map((match) => [match.metadata.matchId, match]));
  const teamRawMatches = sharedMatchIds.flatMap((matchId) => {
    const match = rawMatchesById.get(matchId);
    return match ? [match] : [];
  });
  const duoRawMatches = duoCandidateIds.flatMap((matchId) => {
    const match = rawMatchesById.get(matchId);
    return match ? [match] : [];
  });
  const rosterPuuids = new Set(accounts.map((account) => account.puuid));
  const matches = findTeamMatches(teamRawMatches, rosterPuuids, minTeammates);
  const duoMatches = findDuoMatches(duoRawMatches, rosterPuuids);
  const timelineResults = await Promise.allSettled(matches.slice(0, TIMELINE_SAMPLE_SIZE).map(async (match) => [match.id, await getMatchTimeline(regionalRouting, match.id)] as const));
  const timelines = new Map(timelineResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
  const championNames = await getChampionNamesById();
  const teamAnalysis = analyzeTeamMatches(matches, timelines, championNames, accounts.length);
  const result = {
    roster: accounts.map(({ puuid, gameName, tagLine }) => ({ puuid, gameName, tagLine })),
    matches,
    analysis: {
      ...teamAnalysis,
      individual: analyzeIndividualMatches(rawMatches, rosterPuuids, teamAnalysis),
      duo: analyzeDuoMatches(duoMatches, championNames)
    },
    scanned: {
      requestedMatchesPerPlayer: matchCount,
      candidateMatches: sharedMatchIds.length,
      retainedMatches: matches.length,
      retainedTimelines: timelines.size
    }
  };

  await saveTeamScan({ roster: result.roster, rawMatches, timelines, result, regionalRouting, minimumTeammates: minTeammates });
  return result;
}
