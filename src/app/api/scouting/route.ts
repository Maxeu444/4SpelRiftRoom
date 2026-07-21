import { asRegionalRouting, getMatch, getMatchIds, resolveRiotAccount } from "@/lib/riot";
import { analyzeOpponentScouting } from "@/lib/scouting";

export const runtime = "nodejs";

const SCOUT_HISTORY_SIZE = 30;
const SCOUT_MATCH_SAMPLE_SIZE = 8;

type ScoutPlayer = { gameName: string; tagLine: string };
type ScoutRequest = { players: ScoutPlayer[]; regionalRouting?: string };

function isScoutPlayer(value: unknown): value is ScoutPlayer {
  if (!value || typeof value !== "object") return false;
  const player = value as ScoutPlayer;
  return typeof player.gameName === "string" && player.gameName.trim().length > 0 && typeof player.tagLine === "string" && player.tagLine.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScoutRequest;
    if (!Array.isArray(body.players) || body.players.length < 1 || body.players.length > 5 || !body.players.every(isScoutPlayer)) {
      return Response.json({ error: "Indiquez entre 1 et 5 Riot ID adverses au format { gameName, tagLine }." }, { status: 400 });
    }

    const regionalRouting = asRegionalRouting(body.regionalRouting ?? process.env.RIOT_REGIONAL_ROUTING);
    const accounts = await Promise.all(body.players.map((player) => resolveRiotAccount(regionalRouting, player.gameName.trim(), player.tagLine.trim())));
    const entries = await Promise.all(accounts.map(async (account) => {
      const matchIds = await getMatchIds(regionalRouting, account.puuid, SCOUT_HISTORY_SIZE);
      const matches = await Promise.all(matchIds.slice(0, SCOUT_MATCH_SAMPLE_SIZE).map((matchId) => getMatch(regionalRouting, matchId)));
      return { account, matches };
    }));

    return Response.json({ report: analyzeOpponentScouting(entries, SCOUT_MATCH_SAMPLE_SIZE) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Le scouting Riot a échoué.";
    return Response.json({ error: message }, { status: 500 });
  }
}
