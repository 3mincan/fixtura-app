import { Platform } from 'react-native';

import {
  GOOGLE_TEST_ANDROID_BANNER_UNIT_ID,
  GOOGLE_TEST_ANDROID_INTERSTITIAL_UNIT_ID,
  GOOGLE_TEST_ANDROID_REWARDED_UNIT_ID,
  GOOGLE_TEST_IOS_BANNER_UNIT_ID,
  GOOGLE_TEST_IOS_INTERSTITIAL_UNIT_ID,
  GOOGLE_TEST_IOS_REWARDED_UNIT_ID,
  isAdsSupportedPlatform,
} from '@/ads/native-ads';
import { resolveProductionInterstitialUnitId } from '@/ads/resolve-interstitial-unit-id';
import {
  ADMOB_ANDROID_BANNER_UNIT_ID,
  ADMOB_ANDROID_INTERSTITIAL_UNIT_ID,
  ADMOB_ANDROID_REWARDED_UNIT_ID,
  ADMOB_IOS_BANNER_UNIT_ID,
  ADMOB_IOS_INTERSTITIAL_UNIT_ID,
  ADMOB_IOS_REWARDED_UNIT_ID,
} from '@/config/admob';
import { useAppStore } from '@/store/app-store';
import type { RemoteAdPlatformConfig } from '@/types/remote-config';
import { resolveAdUnitId, shouldUseTestAdUnits } from '@/ads/resolve-ad-unit-id';

function firstConfiguredUnitId(...unitIds: (string | undefined)[]): string | undefined {
  return unitIds.find((unitId) => unitId != null && unitId.length > 0);
}

function getRemotePlatformAdConfig(): RemoteAdPlatformConfig | null {
  const { remoteConfig } = useAppStore.getState();

  if (remoteConfig?.adsEnabled === false) {
    return null;
  }

  if (Platform.OS === 'ios') {
    return remoteConfig?.adMob?.ios ?? null;
  }

  if (Platform.OS === 'android') {
    return remoteConfig?.adMob?.android ?? null;
  }

  return null;
}

export function areAdsEnabled(): boolean {
  return useAppStore.getState().remoteConfig?.adsEnabled !== false;
}

function getBannerTestUnitId(): string {
  return Platform.OS === 'ios'
    ? GOOGLE_TEST_IOS_BANNER_UNIT_ID
    : GOOGLE_TEST_ANDROID_BANNER_UNIT_ID;
}

function getInterstitialTestUnitId(): string {
  return Platform.OS === 'ios'
    ? GOOGLE_TEST_IOS_INTERSTITIAL_UNIT_ID
    : GOOGLE_TEST_ANDROID_INTERSTITIAL_UNIT_ID;
}

function getRewardedTestUnitId(): string {
  return Platform.OS === 'ios'
    ? GOOGLE_TEST_IOS_REWARDED_UNIT_ID
    : GOOGLE_TEST_ANDROID_REWARDED_UNIT_ID;
}

export function getBannerUnitId(): string {
  const remoteAdConfig = getRemotePlatformAdConfig();

  if (Platform.OS === 'ios') {
    return resolveAdUnitId(
      firstConfiguredUnitId(
        remoteAdConfig?.bannerUnitId,
        process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
      ),
      ADMOB_IOS_BANNER_UNIT_ID,
      getBannerTestUnitId(),
    );
  }

  if (Platform.OS === 'android') {
    return resolveAdUnitId(
      firstConfiguredUnitId(
        remoteAdConfig?.bannerUnitId,
        process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
      ),
      ADMOB_ANDROID_BANNER_UNIT_ID,
      getBannerTestUnitId(),
    );
  }

  return getBannerTestUnitId();
}

export function getInterstitialUnitId(): string | null {
  if (!areAdsEnabled()) {
    return null;
  }

  if (shouldUseTestAdUnits()) {
    return getInterstitialTestUnitId();
  }

  const remoteAdConfig = getRemotePlatformAdConfig();

  if (Platform.OS === 'ios') {
    return resolveProductionInterstitialUnitId(
      firstConfiguredUnitId(
        remoteAdConfig?.interstitialUnitId,
        process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
      ),
      ADMOB_IOS_INTERSTITIAL_UNIT_ID,
    );
  }

  if (Platform.OS === 'android') {
    return resolveProductionInterstitialUnitId(
      firstConfiguredUnitId(
        remoteAdConfig?.interstitialUnitId,
        process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
      ),
      ADMOB_ANDROID_INTERSTITIAL_UNIT_ID,
    );
  }

  return null;
}

export function isInterstitialAdsConfigured(): boolean {
  return getInterstitialUnitId() != null;
}

export function getRewardedUnitId(): string | null {
  if (!areAdsEnabled()) {
    return null;
  }

  if (shouldUseTestAdUnits()) {
    return getRewardedTestUnitId();
  }

  const remoteAdConfig = getRemotePlatformAdConfig();

  if (Platform.OS === 'ios') {
    return resolveProductionInterstitialUnitId(
      firstConfiguredUnitId(
        remoteAdConfig?.rewardedUnitId,
        process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID,
      ),
      ADMOB_IOS_REWARDED_UNIT_ID,
    );
  }

  if (Platform.OS === 'android') {
    return resolveProductionInterstitialUnitId(
      firstConfiguredUnitId(
        remoteAdConfig?.rewardedUnitId,
        process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID,
      ),
      ADMOB_ANDROID_REWARDED_UNIT_ID,
    );
  }

  return null;
}

export function isRewardedAdsConfigured(): boolean {
  return getRewardedUnitId() != null;
}

export { isAdsSupportedPlatform };
export { resolveAdUnitId, shouldUseTestAdUnits };
