export const GOOGLE_TEST_ANDROID_BANNER_UNIT_ID = '';
export const GOOGLE_TEST_ANDROID_INTERSTITIAL_UNIT_ID = '';
export const GOOGLE_TEST_ANDROID_REWARDED_UNIT_ID = '';
export const GOOGLE_TEST_IOS_BANNER_UNIT_ID = '';
export const GOOGLE_TEST_IOS_INTERSTITIAL_UNIT_ID = '';
export const GOOGLE_TEST_IOS_REWARDED_UNIT_ID = '';

export function isAdsSupportedPlatform(): boolean {
  return false;
}

export function isNativeAdsModuleLinked(): boolean {
  return false;
}

export function canShowAds(): boolean {
  return false;
}

export function loadMobileAdsModule(): null {
  return null;
}
