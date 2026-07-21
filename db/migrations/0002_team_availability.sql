CREATE TABLE IF NOT EXISTS team_availability_slots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_puuid TEXT NOT NULL REFERENCES players(puuid) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minutes SMALLINT NOT NULL CHECK (start_minutes BETWEEN 0 AND 1439),
  end_minutes SMALLINT NOT NULL CHECK (end_minutes BETWEEN 1 AND 1440),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_minutes > start_minutes),
  UNIQUE (team_id, player_puuid, weekday, start_minutes, end_minutes)
);

CREATE INDEX IF NOT EXISTS team_availability_slots_team_day_idx
  ON team_availability_slots (team_id, weekday, start_minutes);
