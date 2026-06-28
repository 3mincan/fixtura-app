import { Platform, TurboModuleRegistry } from 'react-native';

export const GOOGLE_TEST_ANDROID_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/9214589741';
export const GOOGLE_TEST_ANDROID_INTERSTITIAL_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';
export const GOOGLE_TEST_ANDROID_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';
export const GOOGLE_TEST_IOS_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/2435281174';
export const GOOGLE_TEST_IOS_INTERSTITIAL_UNIT_ID = 'ca-app-pub-3940256099942544/4411468910';
export const GOOGLE_TEST_IOS_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/1712485313';

type MobileAdsModule = typeof import('react-native-google-mobile-ads');

let cachedModule: MobileAdsModule | null | undefined;

export function isAdsSupportedPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function loadMobileAdsModule(): MobileAdsModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  if (!isAdsSupportedPlatform()) {
    cachedModule = null;
    return null;
  }

  try {
    cachedModule = require('react-native-google-mobile-ads') as MobileAdsModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

export function isNativeAdsModuleLinked(): boolean {
  if (!isAdsSupportedPlatform()) {
    return false;
  }

  return (
    TurboModuleRegistry.get('RNGoogleMobileAdsModule') != null ||
    loadMobileAdsModule() != null
  );
}

export function canShowAds(): boolean {
  return loadMobileAdsModule() != null;
}
