import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readResolvedPlugins(appVariant: string): string[] {
  const result = spawnSync('npx', ['expo', 'config', '--type', 'public', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_VARIANT: appVariant,
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const config = JSON.parse(result.stdout) as { plugins?: unknown[] };
  return (config.plugins ?? []).flatMap((plugin) => {
    if (typeof plugin === 'string') {
      return [plugin];
    }

    if (Array.isArray(plugin) && typeof plugin[0] === 'string') {
      return [plugin[0]];
    }

    return [];
  });
}

describe('app build variant', () => {
  it('includes expo-dev-client only for development builds', () => {
    const developmentPlugins = readResolvedPlugins('development');
    const productionPlugins = readResolvedPlugins('production');

    assert.ok(developmentPlugins.includes('expo-dev-client'));
    assert.ok(!productionPlugins.includes('expo-dev-client'));
  });
});
