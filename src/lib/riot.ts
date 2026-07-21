import type { RiotMatch } from "./analytics";

const routingValues = ["AMERICAS", "ASIA", "EUROPE", "SEA"] as const;
export type RegionalRouting = (typeof routingValues)[number];

type RiotAccount = { puuid: string; gameName: string; tagLine: string };

function riotHeaders() {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error("RIOT_API_KEY est absente. Ajoutez-la dans .env.local avant la synchronisation.");
  return { "X-Riot-Token": apiKey };
}

async function riotFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: riotHeaders(), cache: "no-store" });
  if (response.ok) return response.json() as Promise<T>;

  const retryAfter = response.headers.get("Retry-After");
  if (response.status === 429) {
    throw new Error(`Limite Riot atteinte. Réessayez dans ${retryAfter ?? "quelques"} secondes.`);
  }
  if (response.status === 404) throw new Error("Un Riot ID n’a pas été trouvé. Vérifiez le pseudo et le tag.");
  throw new Error(`Riot API a répondu ${response.status}.`);
}

export async function resolveRiotAccount(regionalRouting: RegionalRouting, gameName: string, tagLine: string) {
  return riotFetch<RiotAccount>(
    `https://${regionalRouting.toLowerCase()}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
}

export async function getMatchIds(regionalRouting: RegionalRouting, puuid: string, count: number) {
  return riotFetch<string[]>(
    `https://${regionalRouting.toLowerCase()}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${count}`
  );
}

export async function getMatch(regionalRouting: RegionalRouting, matchId: string) {
  return riotFetch<RiotMatch>(
    `https://${regionalRouting.toLowerCase()}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`
  );
}

export function asRegionalRouting(value: string | undefined): RegionalRouting {
  const upper = value?.toUpperCase();
  if (upper && routingValues.includes(upper as RegionalRouting)) return upper as RegionalRouting;
  return "EUROPE";
}

