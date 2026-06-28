import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { parse: parsePlist } = require('@expo/plist').default;

const root = process.cwd();
const privacyPath = path.join(root, 'ios/Fixtura/PrivacyInfo.xcprivacy');
const trackedPrivacyPath = path.join(root, 'store/ios/PrivacyInfo.xcprivacy');
const infoPath = path.join(root, 'ios/Fixtura/Info.plist');
const expectedPrivacy = JSON.parse(
  readFileSync(path.join(root, 'ios-privacy-manifest.json'), 'utf8'),
);

if (!existsSync(privacyPath) || !existsSync(infoPath)) {
  if (!existsSync(trackedPrivacyPath)) {
    console.log('ios/ not present — skipping native sync verification');
    process.exit(0);
  }

  const trackedPrivacy = parsePlist(readFileSync(trackedPrivacyPath, 'utf8'));
  const collectedTypes =
    trackedPrivacy.NSPrivacyCollectedDataTypes?.map(
      (entry) => entry.NSPrivacyCollectedDataType,
    ) ?? [];

  for (const entry of expectedPrivacy.NSPrivacyCollectedDataTypes) {
    assert.ok(
      collectedTypes.includes(entry.NSPrivacyCollectedDataType),
      `store/ios/PrivacyInfo.xcprivacy is missing ${entry.NSPrivacyCollectedDataType}. Run: npm run ios:sync-privacy-info`,
    );
  }

  console.log('Committed PrivacyInfo.xcprivacy matches Expo config');
  process.exit(0);
}

const actualPrivacy = parsePlist(readFileSync(privacyPath, 'utf8'));
const infoPlist = parsePlist(readFileSync(infoPath, 'utf8'));

const collectedTypes =
  actualPrivacy.NSPrivacyCollectedDataTypes?.map(
    (entry) => entry.NSPrivacyCollectedDataType,
  ) ?? [];

for (const entry of expectedPrivacy.NSPrivacyCollectedDataTypes) {
  assert.ok(
    collectedTypes.includes(entry.NSPrivacyCollectedDataType),
    `PrivacyInfo.xcprivacy is missing ${entry.NSPrivacyCollectedDataType}. Run: npm run ios:sync-native`,
  );
}

assert.equal(
  actualPrivacy.NSPrivacyTracking,
  expectedPrivacy.NSPrivacyTracking,
  'PrivacyInfo.xcprivacy NSPrivacyTracking does not match ios-privacy-manifest.json',
);

assert.equal(
  infoPlist.GADDelayAppMeasurementInit,
  true,
  'Info.plist GADDelayAppMeasurementInit must be true (delayAppMeasurementInit in app.config.ts). Run: npm run ios:sync-native',
);

assert.equal(
  infoPlist.NSMicrophoneUsageDescription,
  undefined,
  'Info.plist must not request microphone access for playback-only audio. Run: npm run ios:sync-native',
);

const backgroundModes = infoPlist.UIBackgroundModes ?? [];
assert.ok(
  !backgroundModes.includes('audio'),
  'Info.plist must not declare UIBackgroundModes audio for foreground-only playback. Run: npm run ios:sync-native',
);

console.log('iOS native files are in sync with Expo config');
