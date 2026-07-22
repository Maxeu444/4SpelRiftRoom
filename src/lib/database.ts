import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import type { RiotMatch, RiotMatchTimeline, SyncedMatch, TeamAnalysis } from "./analytics";

const FORMULA_VERSION = "2026-07-21.1";

type RosterPlayer = { puuid: string; gameName: string; tagLine: string };

export type PersistedScanResult = {
  roster: RosterPlayer[];
  matches: SyncedMatch[];
  analysis: TeamAnalysis;
  scanned: {
    requestedMatchesPerPlayer: number;
    candidateMatches: number;
    retainedMatches: number;
    retainedTimelines: number;
  };
};

export type LatestTeamData = { result: PersistedScanResult; workspace: Record<string, unknown> };
export type AvailabilitySlot = {
  id: number;
  playerPuuid: string;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
};
export type LatestTeamSyncInput = {
  players: Array<{ gameName: string; tagLine: string }>;
  regionalRouting: string;
  minTeammates: number;
  matchCount: number;
};

type SaveScanInput = {
  roster: RosterPlayer[];
  rawMatches: RiotMatch[];
  timelines: Map<string, RiotMatchTimeline>;
  result: PersistedScanResult;
  regionalRouting: string;
  minimumTeammates: number;
};

type DatabaseGlobal = typeof globalThis & { riftRoomPool?: Pool };

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL est absente. Ajoutez la variable Railway à ce service avant de synchroniser.");
  return value;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  const globalForDatabase = globalThis as DatabaseGlobal;
  if (!globalForDatabase.riftRoomPool) {
    globalForDatabase.riftRoomPool = new Pool({
      connectionString: databaseUrl(),
      max: 5,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }
  return globalForDatabase.riftRoomPool;
}

function rosterKey(roster: RosterPlayer[]) {
  return createHash("sha256").update(roster.map((player) => player.puuid).sort().join(":"), "utf8").digest("hex");
}

async function getOrCreateTeam(client: PoolClient, roster: RosterPlayer[]) {
  const key = rosterKey(roster);
  const result = await client.query<{ id: string }>(
    `INSERT INTO teams (roster_key)
     VALUES ($1)
     ON CONFLICT (roster_key) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [key]
  );
  return result.rows[0]!.id;
}

async function saveRoster(client: PoolClient, teamId: string, roster: RosterPlayer[]) {
  for (const player of roster) {
    const riotId = `${player.gameName}#${player.tagLine}`;
    await client.query(
      `INSERT INTO players (puuid, game_name, tag_line, riot_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (puuid) DO UPDATE SET game_name = EXCLUDED.game_name, tag_line = EXCLUDED.tag_line, riot_id = EXCLUDED.riot_id, updated_at = NOW()`,
      [player.puuid, player.gameName, player.tagLine, riotId]
    );
    await client.query(
      `INSERT INTO team_members (team_id, player_puuid)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [teamId, player.puuid]
    );
  }
}

async function saveRawMatches(client: PoolClient, rawMatches: RiotMatch[]) {
  for (const match of rawMatches) {
    const info = match.info;
    await client.query(
      `INSERT INTO matches (match_id, game_started_at, game_ended_at, game_duration_seconds, queue_id, game_version, raw_match)
       VALUES ($1, to_timestamp($2 / 1000.0), to_timestamp($3 / 1000.0), $4, $5, $6, $7::jsonb)
       ON CONFLICT (match_id) DO UPDATE SET
         game_started_at = EXCLUDED.game_started_at,
         game_ended_at = EXCLUDED.game_ended_at,
         game_duration_seconds = EXCLUDED.game_duration_seconds,
         queue_id = EXCLUDED.queue_id,
         game_version = EXCLUDED.game_version,
         raw_match = EXCLUDED.raw_match,
         fetched_at = NOW()`,
      [match.metadata.matchId, info.gameStartTimestamp ?? null, info.gameEndTimestamp ?? null, info.gameDuration, info.queueId ?? null, info.gameVersion ?? null, JSON.stringify(match)]
    );

    for (const participant of info.participants) {
      await client.query(
        `INSERT INTO match_participants (
          match_id, player_puuid, team_id, won, role, champion_name, kills, deaths, assists,
          gold_earned, minions_killed, neutral_minions_killed, vision_score, raw_participant
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
        ON CONFLICT (match_id, player_puuid) DO UPDATE SET
          team_id = EXCLUDED.team_id, won = EXCLUDED.won, role = EXCLUDED.role,
          champion_name = EXCLUDED.champion_name, kills = EXCLUDED.kills, deaths = EXCLUDED.deaths,
          assists = EXCLUDED.assists, gold_earned = EXCLUDED.gold_earned,
          minions_killed = EXCLUDED.minions_killed, neutral_minions_killed = EXCLUDED.neutral_minions_killed,
          vision_score = EXCLUDED.vision_score, raw_participant = EXCLUDED.raw_participant`,
        [
          match.metadata.matchId,
          participant.puuid,
          participant.teamId,
          participant.win,
          participant.teamPosition ?? participant.individualPosition ?? null,
          participant.championName,
          participant.kills,
          participant.deaths,
          participant.assists,
          participant.goldEarned,
          participant.totalMinionsKilled,
          participant.neutralMinionsKilled,
          participant.visionScore,
          JSON.stringify(participant)
        ]
      );
    }
  }
}

async function saveTimelines(client: PoolClient, timelines: Map<string, RiotMatchTimeline>) {
  for (const [matchId, timeline] of timelines) {
    await client.query(
      `INSERT INTO match_timelines (match_id, raw_timeline)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (match_id) DO UPDATE SET raw_timeline = EXCLUDED.raw_timeline, fetched_at = NOW()`,
      [matchId, JSON.stringify(timeline)]
    );
  }
}

export async function saveTeamScan(input: SaveScanInput) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const teamId = await getOrCreateTeam(client, input.roster);
    await saveRoster(client, teamId, input.roster);
    await saveRawMatches(client, input.rawMatches);
    await saveTimelines(client, input.timelines);

    for (const match of input.result.matches) {
      await client.query(
        `INSERT INTO team_matches (team_id, match_id, roster_players, team_kills)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (team_id, match_id) DO UPDATE SET roster_players = EXCLUDED.roster_players, team_kills = EXCLUDED.team_kills`,
        [teamId, match.id, match.teamParticipants.length, match.teamKills]
      );
    }

    const syncRunId = randomUUID();
    await client.query(
      `INSERT INTO sync_runs (
        id, team_id, regional_routing, requested_matches_per_player, minimum_teammates,
        formula_version, response, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'completed')`,
      [
        syncRunId,
        teamId,
        input.regionalRouting,
        input.result.scanned.requestedMatchesPerPlayer,
        input.minimumTeammates,
        FORMULA_VERSION,
        JSON.stringify(input.result)
      ]
    );
    for (const [position, match] of input.result.matches.entries()) {
      await client.query(
        "INSERT INTO sync_run_matches (sync_run_id, match_id, position) VALUES ($1, $2, $3)",
        [syncRunId, match.id, position]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadLatestTeamScan(): Promise<LatestTeamData | null> {
  const result = await getPool().query<{ response: PersistedScanResult; workspace: Record<string, unknown> }>(
    `SELECT sync_runs.response, COALESCE(team_workspaces.state, '{}'::jsonb) AS workspace
     FROM sync_runs
     LEFT JOIN team_workspaces ON team_workspaces.team_id = sync_runs.team_id
     WHERE status = 'completed'
     ORDER BY completed_at DESC
     LIMIT 1`
  );
  const row = result.rows[0];
  return row ? { result: row.response, workspace: row.workspace } : null;
}

export async function saveLatestTeamWorkspace(state: Record<string, unknown>) {
  const result = await getPool().query<{ team_id: string }>(
    `SELECT team_id FROM sync_runs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1`
  );
  const teamId = result.rows[0]?.team_id;
  if (!teamId) throw new Error("Synchronisez une équipe avant d'enregistrer le playbook.");
  await getPool().query(
    `INSERT INTO team_workspaces (team_id, state)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (team_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [teamId, JSON.stringify(state)]
  );
}

async function latestTeamId() {
  const result = await getPool().query<{ team_id: string }>(
    `SELECT team_id FROM sync_runs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1`
  );
  const teamId = result.rows[0]?.team_id;
  if (!teamId) throw new Error("Synchronisez une équipe avant de gérer les disponibilités.");
  return teamId;
}

export async function loadLatestTeamAvailability() {
  const teamId = await latestTeamId();
  const result = await getPool().query<{
    id: string;
    player_puuid: string;
    weekday: number;
    start_minutes: number;
    end_minutes: number;
  }>(
    `SELECT id, player_puuid, weekday, start_minutes, end_minutes
     FROM team_availability_slots
     WHERE team_id = $1
     ORDER BY weekday, start_minutes, end_minutes`,
    [teamId]
  );
  return result.rows.map((slot) => ({
    id: Number(slot.id),
    playerPuuid: slot.player_puuid,
    weekday: slot.weekday,
    startMinutes: slot.start_minutes,
    endMinutes: slot.end_minutes
  }));
}

export async function addLatestTeamAvailability(input: Omit<AvailabilitySlot, "id">) {
  const teamId = await latestTeamId();
  const member = await getPool().query(
    `SELECT 1 FROM team_members WHERE team_id = $1 AND player_puuid = $2`,
    [teamId, input.playerPuuid]
  );
  if (!member.rowCount) throw new Error("Ce joueur ne fait pas partie du roster synchronisé.");
  await getPool().query(
    `INSERT INTO team_availability_slots (team_id, player_puuid, weekday, start_minutes, end_minutes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [teamId, input.playerPuuid, input.weekday, input.startMinutes, input.endMinutes]
  );
}

export async function removeLatestTeamAvailability(slotId: number) {
  const teamId = await latestTeamId();
  await getPool().query("DELETE FROM team_availability_slots WHERE id = $1 AND team_id = $2", [slotId, teamId]);
}

export async function loadLatestTeamSyncInput(): Promise<LatestTeamSyncInput> {
  const result = await getPool().query<{
    roster: Array<{ gameName: string; tagLine: string }>;
    regional_routing: string;
    minimum_teammates: number;
    requested_matches_per_player: number;
  }>(
    `SELECT response->'roster' AS roster, regional_routing, minimum_teammates, requested_matches_per_player
     FROM sync_runs
     WHERE status = 'completed'
     ORDER BY completed_at DESC
     LIMIT 1`
  );
  const row = result.rows[0];
  if (!row?.roster?.length) throw new Error("Synchronisez une équipe manuellement avant d'activer le Cron.");
  return {
    players: row.roster.map(({ gameName, tagLine }) => ({ gameName, tagLine })),
    regionalRouting: row.regional_routing,
    minTeammates: row.minimum_teammates,
    matchCount: row.requested_matches_per_player
  };
}

export async function withSynchronizationLock<T>(task: () => Promise<T>) {
  const client = await getPool().connect();
  try {
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(457814) AS locked");
    if (!lock.rows[0]?.locked) throw new Error("Une synchronisation est déjà en cours. Réessayez dans quelques minutes.");
    try {
      return await task();
    } finally {
      await client.query("SELECT pg_advisory_unlock(457814)");
    }
  } finally {
    client.release();
  }
}
