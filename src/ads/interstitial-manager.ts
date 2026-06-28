import {
  recordInterstitialShown,
  shouldShowInterstitial,
  type AdGate,
  type AdIntensity,
} from '@/ads/ad-policy';
import { getInterstitialUnitId, isInterstitialAdsConfigured } from '@/ads/ad-units';
import { canShowAds, loadMobileAdsModule } from '@/ads/native-ads';

type InterstitialAdInstance = ReturnType<
  typeof import('react-native-google-mobile-ads')['InterstitialAd']['createForAdRequest']
>;

class InterstitialManager {
  private ad: InterstitialAdInstance | null = null;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private listenersAttached = false;

  private ensureAd(): InterstitialAdInstance | null {
    if (this.ad) {
      return this.ad;
    }

    if (!isInterstitialAdsConfigured()) {
      return null;
    }

    const unitId = getInterstitialUnitId();
    if (!unitId) {
      return null;
    }

    const mobileAds = loadMobileAdsModule();
    if (!mobileAds) {
      return null;
    }

    this.ad = mobileAds.InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    if (!this.listenersAttached) {
      this.listenersAttached = true;
      this.ad.addAdEventListener(mobileAds.AdEventType.LOADED, () => {
        this.loaded = true;
      });
      this.ad.addAdEventListener(mobileAds.AdEventType.CLOSED, () => {
        this.loaded = false;
        this.preload();
      });
      this.ad.addAdEventListener(mobileAds.AdEventType.ERROR, () => {
        this.loaded = false;
      });
    }

    return this.ad;
  }

  preload(): void {
    if (!canShowAds() || !isInterstitialAdsConfigured()) {
      return;
    }

    const ad = this.ensureAd();
    if (!ad) {
      return;
    }

    const mobileAds = loadMobileAdsModule();
    if (!mobileAds) {
      return;
    }

    this.loadPromise = new Promise((resolve) => {
      const unsubscribeLoaded = ad.addAdEventListener(mobileAds.AdEventType.LOADED, () => {
        unsubscribeLoaded();
        unsubscribeError();
        this.loaded = true;
        resolve();
      });
      const unsubscribeError = ad.addAdEventListener(mobileAds.AdEventType.ERROR, () => {
        unsubscribeLoaded();
        unsubscribeError();
        this.loaded = false;
        resolve();
      });

      ad.load();
    });
  }

  async showIfAllowed(gate: AdGate, intensity: AdIntensity): Promise<boolean> {
    if (!canShowAds() || !shouldShowInterstitial(gate, intensity)) {
      return false;
    }

    const ad = this.ensureAd();
    if (!ad) {
      return false;
    }

    if (!this.loaded) {
      this.preload();
      await this.loadPromise;
    }

    if (!this.loaded) {
      return false;
    }

    try {
      await ad.show();
      recordInterstitialShown(gate);
      return true;
    } catch {
      this.loaded = false;
      this.preload();
      return false;
    }
  }
}

export const interstitialManager = new InterstitialManager();

export async function showInterstitialIfAllowed(
  gate: AdGate,
  intensity: AdIntensity,
): Promise<boolean> {
  return interstitialManager.showIfAllowed(gate, intensity);
}

export function preloadInterstitial(): void {
  interstitialManager.preload();
}
