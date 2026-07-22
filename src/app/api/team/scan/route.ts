import { analyzeTeamMatches, findTeamMatches } from "@/lib/analytics";
import { getChampionCatalog } from "@/lib/data-dragon";
import { asRegionalRouting, getMatch, getMatchIds, getMatchTimeline, resolveRiotAccount } from "@/lib/riot";

export const runtime = "nodejs";

const DEFAULT_MATCH_HISTORY_SIZE = 100;
const TEAM_MATCH_SAMPLE_SIZE = 40;
const TIMELINE_SAMPLE_SIZE = 8;

type ScanPlayer = { gameName: string; tagLine: string };

type ScanRequest = {
  players: ScanPlayer[];
  regionalRouting?: string;
  minTeammates?: number;
  matchCount?: number;
};

function isScanPlayer(value: unknown): value is ScanPlayer {
  if (!value || typeof value !== "object") return false;
  const player = value as ScanPlayer;
  return typeof player.gameName === "string" && player.gameName.trim().length > 0 && typeof player.tagLine === "string" && player.tagLine.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScanRequest;
    if (!Array.isArray(body.players) || body.players.length < 3 || body.players.length > 5 || !body.players.every(isScanPlayer)) {
      return Response.json({ error: "Indiquez entre 3 et 5 Riot ID au format { gameName, tagLine }." }, { status: 400 });
    }

    const regionalRouting = asRegionalRouting(body.regionalRouting ?? process.env.RIOT_REGIONAL_ROUTING);
    const minTeammates = Math.max(3, Math.min(body.minTeammates ?? 3, body.players.length));
    const matchCount = Math.max(10, Math.min(body.matchCount ?? DEFAULT_MATCH_HISTORY_SIZE, 100));

    const accounts = await Promise.all(body.players.map((player) => resolveRiotAccount(regionalRouting, player.gameName.trim(), player.tagLine.trim())));
    const matchLists = await Promise.all(accounts.map((account) => getMatchIds(regionalRouting, account.puuid, matchCount)));

    // Un Match ID ne déclenche un téléchargement de détail que s’il est partagé par suffisamment de membres.
    const occurrences = new Map<string, number>();
    for (const ids of matchLists) {
      for (const id of new Set(ids)) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
    }
    // L'historique est renvoyé du plus récent au plus ancien : on garde les 40 dernières
    // parties communes. Cette taille reste compatible avec la cadence d'une clé Riot de développement.
    const sharedMatchIds = matchLists[0]
      .filter((matchId) => (occurrences.get(matchId) ?? 0) >= minTeammates)
      .slice(0, TEAM_MATCH_SAMPLE_SIZE);

    const rawMatches = await Promise.all(sharedMatchIds.map((matchId) => getMatch(regionalRouting, matchId)));
    const matches = findTeamMatches(rawMatches, new Set(accounts.map((account) => account.puuid)), minTeammates);
    const timelineResults = await Promise.allSettled(matches.slice(0, TIMELINE_SAMPLE_SIZE).map(async (match) => [match.id, await getMatchTimeline(regionalRouting, match.id)] as const));
    const timelines = new Map(timelineResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
    const championCatalog = await getChampionCatalog();

    return Response.json({
      roster: accounts.map(({ puuid, gameName, tagLine }) => ({ puuid, gameName, tagLine })),
      matches,
      championImages: championCatalog.imagesByName,
      analysis: analyzeTeamMatches(matches, timelines, championCatalog.namesById, accounts.length),
      scanned: {
        requestedMatchesPerPlayer: matchCount,
        candidateMatches: sharedMatchIds.length,
        retainedMatches: matches.length,
        retainedTimelines: timelines.size
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "La synchronisation a échoué.";
    return Response.json({ error: message }, { status: 500 });
  }
}
