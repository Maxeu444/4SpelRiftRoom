import {
  addLatestTeamAvailability,
  isDatabaseConfigured,
  loadLatestTeamAvailability,
  removeLatestTeamAvailability
} from "@/lib/database";

export const runtime = "nodejs";

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) return Response.json({ slots: [] });
    return Response.json({ slots: await loadLatestTeamAvailability() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de charger les disponibilités.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_URL est absente." }, { status: 503 });
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "add") {
      const { playerPuuid, weekday, startMinutes, endMinutes } = body;
      if (typeof playerPuuid !== "string" || !isInteger(weekday) || !isInteger(startMinutes) || !isInteger(endMinutes) || weekday < 0 || weekday > 6 || startMinutes < 0 || endMinutes > 1440 || endMinutes <= startMinutes) {
        return Response.json({ error: "Créneau invalide." }, { status: 400 });
      }
      await addLatestTeamAvailability({ playerPuuid, weekday, startMinutes, endMinutes });
    } else if (body.action === "remove") {
      const { slotId } = body;
      if (!isInteger(slotId) || slotId <= 0) return Response.json({ error: "Créneau invalide." }, { status: 400 });
      await removeLatestTeamAvailability(slotId);
    } else {
      return Response.json({ error: "Action de planning invalide." }, { status: 400 });
    }
    return Response.json({ slots: await loadLatestTeamAvailability() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer les disponibilités.";
    return Response.json({ error: message }, { status: 500 });
  }
}
