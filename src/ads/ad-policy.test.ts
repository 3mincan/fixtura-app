import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  recordInterstitialShown,
  resetAdSessionCounters,
  resetInterstitialCooldownForTests,
  resolveAdIntensity,
  shouldShowHomeBanner,
  shouldShowInterstitial,
  shouldShowMatchdayBanner,
} from '@/ads/ad-policy';

describe('resolveAdIntensity', () => {
  it('returns heavy when ai and auto-reveal are enabled', () => {
    assert.equal(
      resolveAdIntensity({ aiEnabled: true, autoReveal: true }),
      'heavy',
    );
  });

  it('returns normal when only one speed feature is enabled', () => {
    assert.equal(resolveAdIntensity({ aiEnabled: true, autoReveal: false }), 'normal');
    assert.equal(resolveAdIntensity({ aiEnabled: false, autoReveal: true }), 'normal');
  });

  it('returns minimal when both are disabled', () => {
    assert.equal(
      resolveAdIntensity({ aiEnabled: false, autoReveal: false }),
      'minimal',
    );
  });
});

describe('banner placement policy', () => {
  it('always allows home banners', () => {
    assert.equal(shouldShowHomeBanner('minimal'), true);
  });

  it('always allows matchday banners', () => {
    assert.equal(shouldShowMatchdayBanner('minimal'), true);
    assert.equal(shouldShowMatchdayBanner('normal'), true);
  });
});

describe('interstitial policy', () => {
  it('always allows tournament end interstitials when cooldown passed', () => {
    resetAdSessionCounters();
    assert.equal(shouldShowInterstitial('tournament-end', 'minimal'), true);
  });

  it('shows every second round summary in minimal mode', () => {
    resetAdSessionCounters();
    assert.equal(shouldShowInterstitial('round-summary', 'minimal'), false);
    recordInterstitialShown('round-summary');
    resetInterstitialCooldownForTests();
    assert.equal(shouldShowInterstitial('round-summary', 'minimal'), true);
  });
});
