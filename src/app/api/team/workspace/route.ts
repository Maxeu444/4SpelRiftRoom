import { isDatabaseConfigured, saveLatestTeamWorkspace } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_URL est absente." }, { status: 503 });
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "L'espace de travail doit être un objet JSON." }, { status: 400 });
    }
    await saveLatestTeamWorkspace(body as Record<string, unknown>);
    return Response.json({ saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer l'espace de travail.";
    return Response.json({ error: message }, { status: 500 });
  }
}
