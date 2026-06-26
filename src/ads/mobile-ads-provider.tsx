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

    const mobileAds = loadMobileAdsModule();
    if (!mobileAds) {
      return;
    }

    void mobileAds.default().initialize();
    preloadInterstitial();
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
