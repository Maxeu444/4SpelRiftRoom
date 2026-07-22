import { isDatabaseConfigured, loadLatestTeamSyncInput, withSynchronizationLock } from "@/lib/database";
import { synchronizeTeam } from "@/lib/team-sync";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) return Response.json({ error: "Non autorisé." }, { status: 401 });
    if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_URL est absente." }, { status: 503 });
    const input = await loadLatestTeamSyncInput();
    const result = await withSynchronizationLock(() => synchronizeTeam(input));
    return Response.json({ synced: true, retainedMatches: result.scanned.retainedMatches, retainedTimelines: result.scanned.retainedTimelines });
  } catch (error) {
    const message = error instanceof Error ? error.message : "La synchronisation planifiée a échoué.";
    return Response.json({ error: message }, { status: 500 });
  }
}
