export const DATABASE_NAME = 'fixtura.db';

export const SCHEMA_VERSION = 4;

export const TABLE_NAMES = [
  'simulations',
  'matches',
  'standings',
  'selected_team',
  'app_settings',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS simulations (
  id TEXT PRIMARY KEY NOT NULL,
  seed TEXT,
  current_stage TEXT NOT NULL DEFAULT 'group',
  tournament_phase TEXT NOT NULL DEFAULT 'group',
  user_qualified INTEGER NOT NULL DEFAULT 0,
  champion_id TEXT,
  team_id TEXT,
  progress_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS selected_team (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  team_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT NOT NULL,
  simulation_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  group_id TEXT,
  regulation_home INTEGER,
  regulation_away INTEGER,
  extra_time_home INTEGER,
  extra_time_away INTEGER,
  penalties_home INTEGER,
  penalties_away INTEGER,
  PRIMARY KEY (id, simulation_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS standings (
  simulation_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (simulation_id, group_id, team_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
);
`;

export const MIGRATION_V2_SQL = `
ALTER TABLE simulations ADD COLUMN progress_json TEXT;
`;

export const MIGRATION_V3_SQL = `
ALTER TABLE simulations ADD COLUMN team_id TEXT;
`;
