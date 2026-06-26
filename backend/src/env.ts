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
};
