CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  roster_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  puuid TEXT PRIMARY KEY,
  game_name TEXT NOT NULL,
  tag_line TEXT NOT NULL,
  riot_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_puuid TEXT NOT NULL REFERENCES players(puuid) ON DELETE RESTRICT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, player_puuid)
);

CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  game_started_at TIMESTAMPTZ,
  game_ended_at TIMESTAMPTZ,
  game_duration_seconds INTEGER NOT NULL,
  queue_id INTEGER,
  game_version TEXT,
  raw_match JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_participants (
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  player_puuid TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  won BOOLEAN NOT NULL,
  role TEXT,
  champion_name TEXT NOT NULL,
  kills INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  gold_earned INTEGER NOT NULL,
  minions_killed INTEGER NOT NULL,
  neutral_minions_killed INTEGER NOT NULL,
  vision_score INTEGER NOT NULL,
  raw_participant JSONB NOT NULL,
  PRIMARY KEY (match_id, player_puuid)
);

CREATE INDEX IF NOT EXISTS match_participants_player_puuid_idx ON match_participants(player_puuid);

CREATE TABLE IF NOT EXISTS match_timelines (
  match_id TEXT PRIMARY KEY REFERENCES matches(match_id) ON DELETE CASCADE,
  raw_timeline JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_matches (
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  roster_players INTEGER NOT NULL,
  team_kills INTEGER NOT NULL,
  PRIMARY KEY (team_id, match_id)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  regional_routing TEXT NOT NULL,
  requested_matches_per_player INTEGER NOT NULL,
  minimum_teammates INTEGER NOT NULL,
  formula_version TEXT NOT NULL,
  response JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sync_runs_latest_idx ON sync_runs(team_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS sync_run_matches (
  sync_run_id TEXT NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  PRIMARY KEY (sync_run_id, match_id),
  UNIQUE (sync_run_id, position)
);

CREATE TABLE IF NOT EXISTS coaching_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_puuid TEXT REFERENCES players(puuid) ON DELETE SET NULL,
  match_id TEXT REFERENCES matches(match_id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_workspaces (
  team_id BIGINT PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
