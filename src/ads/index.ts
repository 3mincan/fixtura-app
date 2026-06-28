export {
  getBannerUnitId,
  getInterstitialUnitId,
  isAdsSupportedPlatform,
  isInterstitialAdsConfigured,
} from '@/ads/ad-units';
export {
  resolveAdIntensity,
  shouldShowHomeBanner,
  shouldShowInterstitial,
  shouldShowMatchdayBanner,
  type AdGate,
  type AdIntensity,
} from '@/ads/ad-policy';
export { interstitialManager, showInterstitialIfAllowed } from '@/ads/interstitial-manager';
export { maybeShowInterstitial, MobileAdsProvider, useAdIntensity } from '@/ads/mobile-ads-provider';
