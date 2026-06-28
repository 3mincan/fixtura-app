import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { stripDevArtifactsFromPbxproj, removeDevClientInfoPlistKeys } = require('../plugins/with-production-ios-cleanup.js');
const { parse: parsePlist, build: buildPlist } = require('@expo/plist').default;

const root = process.cwd();
const infoPath = path.join(root, 'ios/Fixtura/Info.plist');
const pbxprojPath = path.join(root, 'ios/Fixtura.xcodeproj/project.pbxproj');
const podfilePropertiesPath = path.join(root, 'ios/Podfile.properties.json');

if (!existsSync(pbxprojPath)) {
  console.log('ios/ not present — skipping dev-client artifact cleanup');
  process.exit(0);
}

const originalPbxproj = readFileSync(pbxprojPath, 'utf8');
const cleanedPbxproj = stripDevArtifactsFromPbxproj(originalPbxproj);

if (cleanedPbxproj !== originalPbxproj) {
  writeFileSync(pbxprojPath, cleanedPbxproj);
  console.log('Removed dev-client artifacts from Xcode project');
}

if (existsSync(infoPath)) {
  const infoPlist = parsePlist(readFileSync(infoPath, 'utf8'));
  const cleanedInfoPlist = removeDevClientInfoPlistKeys({ ...infoPlist });
  writeFileSync(infoPath, buildPlist(cleanedInfoPlist));
}

if (existsSync(podfilePropertiesPath)) {
  const podfileProperties = JSON.parse(readFileSync(podfilePropertiesPath, 'utf8'));
  delete podfileProperties.EX_DEV_CLIENT_NETWORK_INSPECTOR;
  writeFileSync(podfilePropertiesPath, `${JSON.stringify(podfileProperties, null, 2)}\n`);
}
