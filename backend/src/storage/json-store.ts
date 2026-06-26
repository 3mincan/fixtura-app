import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { DatabaseSnapshot } from '../types.js';

const EMPTY_DATABASE: DatabaseSnapshot = {
  users: [],
  simulations: [],
  events: [],
};

export class JsonStore {
  private readonly filePath: string;
  private writeQueue = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'fixtura.json');
  }

  async read(): Promise<DatabaseSnapshot> {
    await this.ensureDirectory();

    try {
      const raw = await readFile(this.filePath, 'utf8');
      return {
        ...EMPTY_DATABASE,
        ...JSON.parse(raw),
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        await this.write(EMPTY_DATABASE);
        return EMPTY_DATABASE;
      }

      throw error;
    }
  }

  async update(mutator: (snapshot: DatabaseSnapshot) => DatabaseSnapshot): Promise<DatabaseSnapshot> {
    const nextWrite = this.writeQueue.then(async () => {
      const current = await this.read();
      const next = mutator(current);
      await this.write(next);
      return next;
    });

    this.writeQueue = nextWrite.then(
      () => undefined,
      () => undefined,
    );

    return nextWrite;
  }

  private async write(snapshot: DatabaseSnapshot): Promise<void> {
    await this.ensureDirectory();
    await writeFile(this.filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
