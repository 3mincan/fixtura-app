import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import iosPrivacyManifest from '../../ios-privacy-manifest.json';

const require = createRequire(import.meta.url);
const { parse: parsePlist } = require('@expo/plist').default;

const trackedPrivacyInfoPath = new URL(
  '../../store/ios/PrivacyInfo.xcprivacy',
  import.meta.url,
);

describe('ios privacy manifest', () => {
  it('declares no tracking', () => {
    assert.equal(iosPrivacyManifest.NSPrivacyTracking, false);
    assert.deepEqual(iosPrivacyManifest.NSPrivacyTrackingDomains, []);
  });

  it('declares analytics, gameplay sync, and advertising data', () => {
    const collectedTypes = iosPrivacyManifest.NSPrivacyCollectedDataTypes?.map(
      (entry) => entry.NSPrivacyCollectedDataType,
    );

    assert.ok(collectedTypes?.includes('NSPrivacyCollectedDataTypeUserID'));
    assert.ok(collectedTypes?.includes('NSPrivacyCollectedDataTypeProductInteraction'));
    assert.ok(collectedTypes?.includes('NSPrivacyCollectedDataTypeGameplayContent'));
    assert.ok(collectedTypes?.includes('NSPrivacyCollectedDataTypeDeviceID'));
    assert.ok(collectedTypes?.includes('NSPrivacyCollectedDataTypeAdvertisingData'));
  });

  it('matches App Store privacy checklist file', () => {
    const checklist = JSON.parse(
      readFileSync(new URL('../../store/app-store-privacy.json', import.meta.url), 'utf8'),
    ) as {
      tracking: { usesTracking: boolean };
      appStoreConnect: { dataCollection: string };
    };

    assert.equal(checklist.tracking.usesTracking, iosPrivacyManifest.NSPrivacyTracking);
    assert.equal(checklist.appStoreConnect.dataCollection, 'Yes, we collect data from this app');
  });

  it('matches committed PrivacyInfo.xcprivacy', () => {
    assert.ok(
      existsSync(trackedPrivacyInfoPath),
      'Run npm run ios:sync-privacy-info to generate store/ios/PrivacyInfo.xcprivacy',
    );

    const privacyInfo = parsePlist(readFileSync(trackedPrivacyInfoPath, 'utf8'));
    const collectedTypes =
      privacyInfo.NSPrivacyCollectedDataTypes?.map(
        (entry) => entry.NSPrivacyCollectedDataType,
      ) ?? [];

    assert.ok(
      collectedTypes.length > 0,
      'Committed PrivacyInfo.xcprivacy must declare collected data types',
    );

    for (const entry of iosPrivacyManifest.NSPrivacyCollectedDataTypes) {
      assert.ok(collectedTypes.includes(entry.NSPrivacyCollectedDataType));
    }

    assert.equal(privacyInfo.NSPrivacyTracking, iosPrivacyManifest.NSPrivacyTracking);
  });
});
