export { openAppDatabase } from '@/db/database';
export { initializeDatabase } from '@/db/init';
export {
  clearSavedProgress,
  listSavedSimulations,
  loadTournamentProgress,
  loadTournamentProgressById,
  saveTournamentProgress,
  toPersistableState,
  type SavedSimulationSummary,
} from '@/db/persistence';
export { createSimulationId } from '@/db/simulation-id';
export {
  CREATE_TABLES_SQL,
  DATABASE_NAME,
  MIGRATION_V2_SQL,
  MIGRATION_V3_SQL,
  SCHEMA_VERSION,
  TABLE_NAMES,
  type TableName,
} from '@/db/schema';
export { createTestDatabase } from '@/db/test-database';
export type { DatabaseClient } from '@/db/types';
