import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

loadEnv({ path: path.join(backendRoot, '.env') });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  dataDir: path.resolve(backendRoot, process.env.DATA_DIR ?? './data'),
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  worldCup2026SourceUrl:
    process.env.WORLD_CUP_2026_SOURCE_URL ??
    'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json',
  worldCup2026CacheTtlMs: Number(process.env.WORLD_CUP_2026_CACHE_TTL_MS ?? 86_400_000),
};
