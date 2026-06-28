import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveProductionInterstitialUnitId } from '@/ads/resolve-interstitial-unit-id';
import { ADMOB_IOS_INTERSTITIAL_UNIT_ID } from '@/config/admob';

describe('interstitial ad unit ids', () => {
  it('returns null in production when no interstitial unit is configured', () => {
    assert.equal(
      resolveProductionInterstitialUnitId(undefined, ADMOB_IOS_INTERSTITIAL_UNIT_ID),
      null,
    );
    assert.equal(resolveProductionInterstitialUnitId('', ADMOB_IOS_INTERSTITIAL_UNIT_ID), null);
  });

  it('prefers EXPO_PUBLIC interstitial ids over admob defaults', () => {
    assert.equal(
      resolveProductionInterstitialUnitId(
        'ca-app-pub-8524608486958068/1234567890',
        ADMOB_IOS_INTERSTITIAL_UNIT_ID,
      ),
      'ca-app-pub-8524608486958068/1234567890',
    );
  });

  it('uses admob defaults when env is unset', () => {
    assert.equal(
      resolveProductionInterstitialUnitId(
        undefined,
        'ca-app-pub-8524608486958068/9876543210',
      ),
      'ca-app-pub-8524608486958068/9876543210',
    );
  });
});
