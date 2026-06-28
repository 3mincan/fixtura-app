import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('ios native sync', () => {
  it('matches Expo config when ios/ is present', () => {
    if (!existsSync(path.join(projectRoot, 'ios/Fixtura/PrivacyInfo.xcprivacy'))) {
      return;
    }

    const result = spawnSync('node', ['scripts/verify-ios-native-sync.mjs'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    assert.equal(
      result.status,
      0,
      result.stdout || result.stderr || 'ios native sync verification failed',
    );
  });
});
