import { useEffect } from 'react';

import { resolveAdIntensity, type AdGate } from '@/ads/ad-policy';
import { preloadInterstitial, showInterstitialIfAllowed } from '@/ads/interstitial-manager';
import { canShowAds, loadMobileAdsModule } from '@/ads/native-ads';
import { useAppStore } from '@/store/app-store';

export function MobileAdsProvider() {
  useEffect(() => {
    if (!canShowAds()) {
      return;
    }

    let cancelled = false;

    async function bootstrapMobileAds() {
      const mobileAdsModule = loadMobileAdsModule();
      if (!mobileAdsModule) {
        return;
      }

      try {
        await mobileAdsModule.AdsConsent.gatherConsent();
      } catch {
        // Consent UI failures should not block gameplay.
      }

      if (cancelled) {
        return;
      }

      const { canRequestAds } = await mobileAdsModule.AdsConsent.getConsentInfo();
      if (!canRequestAds) {
        return;
      }

      await mobileAdsModule.default().initialize();
      preloadInterstitial();
    }

    void bootstrapMobileAds();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export function useAdIntensity() {
  const aiEnabled = useAppStore((state) => state.aiEnabled);
  const autoReveal = useAppStore((state) => state.autoReveal);

  return resolveAdIntensity({ aiEnabled, autoReveal });
}

export async function maybeShowInterstitial(gate: AdGate): Promise<void> {
  const { aiEnabled, autoReveal } = useAppStore.getState();
  const intensity = resolveAdIntensity({ aiEnabled, autoReveal });
  await showInterstitialIfAllowed(gate, intensity);
}
