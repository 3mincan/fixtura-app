import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

describe('eas release config', () => {
  it('uses remote app version source with production auto-increment', () => {
    const eas = readJson('eas.json') as {
      cli?: { appVersionSource?: string };
      build?: { production?: { autoIncrement?: boolean; distribution?: string; environment?: string } };
    };

    assert.equal(eas.cli?.appVersionSource, 'remote');
    assert.equal(eas.build?.production?.autoIncrement, true);
    assert.equal(eas.build?.production?.distribution, 'store');
    assert.equal(eas.build?.production?.environment, 'production');
  });

  it('declares production submit metadata and android track', () => {
    const eas = readJson('eas.json') as {
      submit?: {
        production?: {
          ios?: { metadataPath?: string; ascAppId?: string; appleTeamId?: string };
          android?: { track?: string; releaseStatus?: string };
        };
      };
    };

    const submit = eas.submit?.production;

    assert.equal(submit?.ios?.metadataPath, './store.config.json');
    assert.equal(submit?.android?.track, 'production');
    assert.equal(submit?.android?.releaseStatus, 'completed');
  });

  it('keeps App Store Connect identifiers in store/eas-release.json', () => {
    const release = readJson('store/eas-release.json') as {
      ios?: { ascAppId?: string; appleTeamId?: string };
      android?: { track?: string };
    };

    assert.ok('ascAppId' in (release.ios ?? {}));
    assert.ok('appleTeamId' in (release.ios ?? {}));
    assert.equal(release.android?.track, 'production');
  });

  it('declares standard encryption export compliance', () => {
    const app = readJson('app.json') as {
      expo?: { ios?: { config?: { usesNonExemptEncryption?: boolean } } };
    };

    assert.equal(app.expo?.ios?.config?.usesNonExemptEncryption, false);
  });
});
