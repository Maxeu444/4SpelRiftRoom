import { isDatabaseConfigured, loadLatestTeamScan, withSynchronizationLock } from "@/lib/database";
import { synchronizeTeam } from "@/lib/team-sync";

export const runtime = "nodejs";

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

export async function GET() {
  try {
    if (!isDatabaseConfigured()) return Response.json({ result: null, workspace: {} });
    const latest = await loadLatestTeamScan();
    return Response.json(latest ?? { result: null, workspace: {} });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de lire la dernière synchronisation.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return Response.json({ error: "DATABASE_URL est absente. Ajoutez la variable PostgreSQL Railway avant de synchroniser." }, { status: 503 });
    }
    const body = (await request.json()) as ScanRequest;
    if (!Array.isArray(body.players) || body.players.length < 3 || body.players.length > 5 || !body.players.every(isScanPlayer)) {
      return Response.json({ error: "Indiquez entre 3 et 5 Riot ID au format { gameName, tagLine }." }, { status: 400 });
    }

    return Response.json(await withSynchronizationLock(() => synchronizeTeam(body)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "La synchronisation a échoué.";
    return Response.json({ error: message }, { status: 500 });
  }
}
