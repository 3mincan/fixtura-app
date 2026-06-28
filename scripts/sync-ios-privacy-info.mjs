import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build: buildPlist, parse: parsePlist } = require('@expo/plist').default;

const root = process.cwd();
const manifestPath = path.join(root, 'ios-privacy-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert.ok(
  Array.isArray(manifest.NSPrivacyCollectedDataTypes) &&
    manifest.NSPrivacyCollectedDataTypes.length > 0,
  'ios-privacy-manifest.json must declare collected data types',
);

const plistContents = buildPlist(manifest);
const targets = [
  path.join(root, 'store/ios/PrivacyInfo.xcprivacy'),
  path.join(root, 'ios/Fixtura/PrivacyInfo.xcprivacy'),
];

for (const targetPath of targets) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, plistContents);
}

const trackedPath = targets[0];
const actual = parsePlist(readFileSync(trackedPath, 'utf8'));
const collectedTypes =
  actual.NSPrivacyCollectedDataTypes?.map((entry) => entry.NSPrivacyCollectedDataType) ?? [];

for (const entry of manifest.NSPrivacyCollectedDataTypes) {
  assert.ok(
    collectedTypes.includes(entry.NSPrivacyCollectedDataType),
    `PrivacyInfo.xcprivacy is missing ${entry.NSPrivacyCollectedDataType}`,
  );
}

console.log(`Synced PrivacyInfo.xcprivacy from ios-privacy-manifest.json (${collectedTypes.length} collected types)`);
