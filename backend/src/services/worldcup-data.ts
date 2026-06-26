import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { WorldCupFixtureData } from '../types.js';

type CachedWorldCupData = {
  sourceUrl: string;
  fetchedAt: number;
  data: WorldCupFixtureData;
};

export class WorldCupDataService {
  private readonly cachePath: string;

  constructor(
    dataDir: string,
    private readonly sourceUrl: string,
    private readonly cacheTtlMs: number,
  ) {
    this.cachePath = path.join(dataDir, 'worldcup-2026.json');
  }

  async getWorldCup2026Data(): Promise<CachedWorldCupData> {
    const cached = await this.readCachedData();

    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached;
    }

    try {
      return await this.refreshWorldCup2026Data();
    } catch (error) {
      if (cached) {
        return cached;
      }

      throw error;
    }
  }

  async refreshWorldCup2026Data(): Promise<CachedWorldCupData> {
    const response = await fetch(this.sourceUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`World Cup source returned ${response.status}`);
    }

    const payload = await response.json();
    const data = parseWorldCupFixtureData(payload);
    const cached = {
      sourceUrl: this.sourceUrl,
      fetchedAt: Date.now(),
      data,
    };

    await this.writeCachedData(cached);

    return cached;
  }

  private async readCachedData(): Promise<CachedWorldCupData | null> {
    try {
      const raw = await readFile(this.cachePath, 'utf8');
      const cached = JSON.parse(raw) as CachedWorldCupData;

      if (
        cached.sourceUrl === this.sourceUrl &&
        typeof cached.fetchedAt === 'number' &&
        isWorldCupFixtureData(cached.data)
      ) {
        return cached;
      }

      return null;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private async writeCachedData(cached: CachedWorldCupData): Promise<void> {
    await mkdir(path.dirname(this.cachePath), { recursive: true });
    await writeFile(this.cachePath, `${JSON.stringify(cached, null, 2)}\n`, 'utf8');
  }
}

function parseWorldCupFixtureData(payload: unknown): WorldCupFixtureData {
  if (!isWorldCupFixtureData(payload)) {
    throw new Error('World Cup source returned invalid fixture data');
  }

  return payload;
}

function isWorldCupFixtureData(payload: unknown): payload is WorldCupFixtureData {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const fixtureData = payload as { name?: unknown; matches?: unknown };

  return typeof fixtureData.name === 'string' && Array.isArray(fixtureData.matches);
}
