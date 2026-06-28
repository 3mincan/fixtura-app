import { Platform } from 'react-native';

import {
  GOOGLE_TEST_BANNER_UNIT_ID,
  GOOGLE_TEST_INTERSTITIAL_UNIT_ID,
  isAdsSupportedPlatform,
} from '@/ads/native-ads';
import { resolveProductionInterstitialUnitId } from '@/ads/resolve-interstitial-unit-id';
import {
  ADMOB_ANDROID_BANNER_UNIT_ID,
  ADMOB_ANDROID_INTERSTITIAL_UNIT_ID,
  ADMOB_IOS_BANNER_UNIT_ID,
  ADMOB_IOS_INTERSTITIAL_UNIT_ID,
} from '@/config/admob';

const TEST_BANNER = GOOGLE_TEST_BANNER_UNIT_ID;
const TEST_INTERSTITIAL = GOOGLE_TEST_INTERSTITIAL_UNIT_ID;

function resolveUnitId(
  envUnitId: string | undefined,
  productionUnitId: string,
  testUnitId: string,
): string {
  if (__DEV__) {
    return testUnitId;
  }

  const configuredUnitId = envUnitId && envUnitId.length > 0 ? envUnitId : productionUnitId;
  return configuredUnitId.length > 0 ? configuredUnitId : testUnitId;
}

export function getBannerUnitId(): string {
  if (Platform.OS === 'ios') {
    return resolveUnitId(
      process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
      ADMOB_IOS_BANNER_UNIT_ID,
      TEST_BANNER,
    );
  }

  if (Platform.OS === 'android') {
    return resolveUnitId(
      process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
      ADMOB_ANDROID_BANNER_UNIT_ID,
      TEST_BANNER,
    );
  }

  return TEST_BANNER;
}

export function getInterstitialUnitId(): string | null {
  if (__DEV__) {
    return TEST_INTERSTITIAL;
  }

  if (Platform.OS === 'ios') {
    return resolveProductionInterstitialUnitId(
      process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
      ADMOB_IOS_INTERSTITIAL_UNIT_ID,
    );
  }

  if (Platform.OS === 'android') {
    return resolveProductionInterstitialUnitId(
      process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
      ADMOB_ANDROID_INTERSTITIAL_UNIT_ID,
    );
  }

  return null;
}

export function isInterstitialAdsConfigured(): boolean {
  return getInterstitialUnitId() != null;
}

export { isAdsSupportedPlatform };
