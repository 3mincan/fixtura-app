import { useEffect } from 'react';

import { resolveAdIntensity, type AdGate } from '@/ads/ad-policy';
import { preloadInterstitial, showInterstitialIfAllowed } from '@/ads/interstitial-manager';
import { loadMobileAdsModule } from '@/ads/native-ads';
import { preloadRewardedAd } from '@/ads/rewarded-manager';
import { fetchRemoteConfig } from '@/services/backend-api';
import { useAppStore } from '@/store/app-store';

export function MobileAdsProvider() {
  useEffect(() => {
    const mobileAdsModule = loadMobileAdsModule();

    if (!mobileAdsModule) {
      return;
    }

    const ads = mobileAdsModule;
    let cancelled = false;
    let started = false;

    async function startGoogleMobileAdsSDK() {
      if (started || cancelled) {
        return;
      }

      try {
        const { canRequestAds } = await ads.AdsConsent.getConsentInfo();

        if (!canRequestAds) {
          return;
        }
      } catch {
        // If consent info is unavailable, still try to initialize with non-personalized requests.
      }

      if (started || cancelled) {
        return;
      }

      started = true;

      try {
        await ads.default().initialize();
        preloadInterstitial();
        preloadRewardedAd();
      } catch {
        started = false;
      }
    }

    void fetchRemoteConfig()
      .then((config) => {
        if (!cancelled && config) {
          useAppStore.getState().setRemoteConfig(config);
          preloadInterstitial();
          preloadRewardedAd();
        }
      })
      .catch(() => {});

    void startGoogleMobileAdsSDK();
    void ads.AdsConsent.gatherConsent()
      .then(startGoogleMobileAdsSDK)
      .catch(startGoogleMobileAdsSDK);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export function useAdIntensity() {
  const aiEnabled = useAppStore((state) => state.aiEnabled);

  return resolveAdIntensity({ aiEnabled, autoReveal: false });
}

export async function maybeShowInterstitial(gate: AdGate): Promise<void> {
  const { aiEnabled } = useAppStore.getState();
  const intensity = resolveAdIntensity({ aiEnabled, autoReveal: false });
  await showInterstitialIfAllowed(gate, intensity);
}
