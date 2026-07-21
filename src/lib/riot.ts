import type { RiotMatch } from "./analytics";

const routingValues = ["AMERICAS", "ASIA", "EUROPE", "SEA"] as const;
export type RegionalRouting = (typeof routingValues)[number];

type RiotAccount = { puuid: string; gameName: string; tagLine: string };

// Une clé de développement Riot a un quota bien plus strict qu'une clé personnelle.
// Cette file module-scoped sérialise aussi les appels issus d'une même synchronisation.
const defaultRequestIntervalMs = 1_100;
const maximumRetries = 3;
let nextRequestAt = 0;

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requestIntervalMs() {
  const configuredInterval = Number(process.env.RIOT_REQUEST_INTERVAL_MS);
  return Number.isFinite(configuredInterval) && configuredInterval >= 250 ? configuredInterval : defaultRequestIntervalMs;
}

async function waitForRiotTurn() {
  const scheduledAt = Math.max(Date.now(), nextRequestAt);
  nextRequestAt = scheduledAt + requestIntervalMs();
  const waitTime = scheduledAt - Date.now();
  if (waitTime > 0) await delay(waitTime);
}

function retryAfterMs(value: string | null) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1_000) : requestIntervalMs() * 2;
}

function riotHeaders() {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error("RIOT_API_KEY est absente. Ajoutez-la dans .env.local avant la synchronisation.");
  return { "X-Riot-Token": apiKey };
}

async function riotFetch<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt <= maximumRetries; attempt += 1) {
    await waitForRiotTurn();
    const response = await fetch(url, { headers: riotHeaders(), cache: "no-store" });
    if (response.ok) return response.json() as Promise<T>;

    if (response.status === 429 && attempt < maximumRetries) {
      const waitTime = retryAfterMs(response.headers.get("Retry-After"));
      // La prochaine requête, même si elle vient d'un autre appel en attente, respecte le délai Riot.
      nextRequestAt = Math.max(nextRequestAt, Date.now() + waitTime);
      await delay(waitTime);
      continue;
    }

    if (response.status === 429) {
      throw new Error("Riot limite encore la synchronisation après plusieurs tentatives. Attendez une minute avant de relancer.");
    }
    if (response.status === 404) throw new Error("Un Riot ID n’a pas été trouvé. Vérifiez le pseudo et le tag.");
    throw new Error(`Riot API a répondu ${response.status}.`);
  }

  throw new Error("La requête Riot n’a pas pu aboutir.");
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
