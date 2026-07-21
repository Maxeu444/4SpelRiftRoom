import { analyzeTeamMatches, findTeamMatches } from "./analytics";
import { saveTeamScan } from "./database";
import { getChampionNamesById } from "./data-dragon";
import { asRegionalRouting, getMatch, getMatchIds, getMatchTimeline, resolveRiotAccount } from "./riot";

const DEFAULT_MATCH_HISTORY_SIZE = 100;
const TEAM_MATCH_SAMPLE_SIZE = 40;
const TIMELINE_SAMPLE_SIZE = 8;

export type TeamSyncPlayer = { gameName: string; tagLine: string };
export type TeamSyncOptions = {
  players: TeamSyncPlayer[];
  regionalRouting?: string;
  minTeammates?: number;
  matchCount?: number;
};

export async function synchronizeTeam(options: TeamSyncOptions) {
  const regionalRouting = asRegionalRouting(options.regionalRouting ?? process.env.RIOT_REGIONAL_ROUTING);
  const minTeammates = Math.max(3, Math.min(options.minTeammates ?? 3, options.players.length));
  const matchCount = Math.max(10, Math.min(options.matchCount ?? DEFAULT_MATCH_HISTORY_SIZE, 100));
  const accounts = await Promise.all(options.players.map((player) => resolveRiotAccount(regionalRouting, player.gameName.trim(), player.tagLine.trim())));
  const matchLists = await Promise.all(accounts.map((account) => getMatchIds(regionalRouting, account.puuid, matchCount)));

  const occurrences = new Map<string, number>();
  for (const ids of matchLists) {
    for (const id of new Set(ids)) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
  }
  const sharedMatchIds = matchLists[0]
    .filter((matchId) => (occurrences.get(matchId) ?? 0) >= minTeammates)
    .slice(0, TEAM_MATCH_SAMPLE_SIZE);

  const rawMatches = await Promise.all(sharedMatchIds.map((matchId) => getMatch(regionalRouting, matchId)));
  const matches = findTeamMatches(rawMatches, new Set(accounts.map((account) => account.puuid)), minTeammates);
  const timelineResults = await Promise.allSettled(matches.slice(0, TIMELINE_SAMPLE_SIZE).map(async (match) => [match.id, await getMatchTimeline(regionalRouting, match.id)] as const));
  const timelines = new Map(timelineResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
  const championNames = await getChampionNamesById();
  const result = {
    roster: accounts.map(({ puuid, gameName, tagLine }) => ({ puuid, gameName, tagLine })),
    matches,
    analysis: analyzeTeamMatches(matches, timelines, championNames, accounts.length),
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
