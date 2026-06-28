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
import { resolveAdUnitId, shouldUseTestAdUnits } from '@/ads/resolve-ad-unit-id';

const TEST_BANNER = GOOGLE_TEST_BANNER_UNIT_ID;
const TEST_INTERSTITIAL = GOOGLE_TEST_INTERSTITIAL_UNIT_ID;

export function getBannerUnitId(): string {
  if (Platform.OS === 'ios') {
    return resolveAdUnitId(
      process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
      ADMOB_IOS_BANNER_UNIT_ID,
      TEST_BANNER,
    );
  }

  if (Platform.OS === 'android') {
    return resolveAdUnitId(
      process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
      ADMOB_ANDROID_BANNER_UNIT_ID,
      TEST_BANNER,
    );
  }

  return TEST_BANNER;
}

export function getInterstitialUnitId(): string | null {
  if (shouldUseTestAdUnits()) {
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
export { resolveAdUnitId, shouldUseTestAdUnits };
