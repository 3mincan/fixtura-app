import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const easPath = path.join(root, 'eas.json');
const releasePath = path.join(root, 'store/eas-release.json');

if (!existsSync(easPath) || !existsSync(releasePath)) {
  process.exit(0);
}

const eas = JSON.parse(readFileSync(easPath, 'utf8'));
const release = JSON.parse(readFileSync(releasePath, 'utf8'));

eas.submit ??= {};
eas.submit.production ??= {};
eas.submit.production.ios ??= {};
eas.submit.production.android ??= {};

const ascAppId = process.env.ASC_APP_ID ?? release.ios?.ascAppId ?? '';
const appleTeamId = process.env.APPLE_TEAM_ID ?? release.ios?.appleTeamId ?? '';

if (ascAppId) {
  eas.submit.production.ios.ascAppId = ascAppId;
} else {
  delete eas.submit.production.ios.ascAppId;
}

if (appleTeamId) {
  eas.submit.production.ios.appleTeamId = appleTeamId;
} else {
  delete eas.submit.production.ios.appleTeamId;
}

eas.submit.production.android.track = release.android?.track ?? 'production';
eas.submit.production.android.releaseStatus = release.android?.releaseStatus ?? 'completed';

writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`);
