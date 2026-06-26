import { Platform, TurboModuleRegistry } from 'react-native';

export const GOOGLE_TEST_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
export const GOOGLE_TEST_INTERSTITIAL_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

type MobileAdsModule = typeof import('react-native-google-mobile-ads');

let cachedModule: MobileAdsModule | null | undefined;

export function isAdsSupportedPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function isNativeAdsModuleLinked(): boolean {
  return TurboModuleRegistry.get('RNGoogleMobileAdsModule') != null;
}

export function canShowAds(): boolean {
  return isAdsSupportedPlatform() && isNativeAdsModuleLinked();
}

export function loadMobileAdsModule(): MobileAdsModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  if (!isNativeAdsModuleLinked()) {
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
