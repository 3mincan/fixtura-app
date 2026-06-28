import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readResolvedInfoPlist(): Record<string, unknown> {
  const result = spawnSync('npx', ['expo', 'config', '--type', 'introspect', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const config = JSON.parse(result.stdout) as {
    ios?: { infoPlist?: Record<string, unknown> };
  };

  return config.ios?.infoPlist ?? {};
}

describe('ios audio permissions', () => {
  it('does not declare microphone or background audio for foreground playback only', () => {
    const infoPlist = readResolvedInfoPlist();

    assert.equal(infoPlist.NSMicrophoneUsageDescription, undefined);
    assert.equal(
      (infoPlist.UIBackgroundModes as string[] | undefined)?.includes('audio'),
      undefined,
    );
  });
});
