import { getRewardedUnitId, isRewardedAdsConfigured } from '@/ads/ad-units';
import { canShowAds, loadMobileAdsModule } from '@/ads/native-ads';

type RewardedAdInstance = ReturnType<
  typeof import('react-native-google-mobile-ads')['RewardedAd']['createForAdRequest']
>;

class RewardedAdManager {
  private ad: RewardedAdInstance | null = null;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private unitId: string | null = null;
  private listenerUnsubscribers: (() => void)[] = [];

  private resetAd(): void {
    for (const unsubscribe of this.listenerUnsubscribers) {
      unsubscribe();
    }

    this.listenerUnsubscribers = [];
    this.ad = null;
    this.loaded = false;
    this.loadPromise = null;
    this.unitId = null;
  }

  private ensureAd(): RewardedAdInstance | null {
    if (!isRewardedAdsConfigured()) {
      this.resetAd();
      return null;
    }

    const unitId = getRewardedUnitId();
    if (!unitId) {
      this.resetAd();
      return null;
    }

    if (this.ad && this.unitId === unitId) {
      return this.ad;
    }

    this.resetAd();

    const mobileAds = loadMobileAdsModule();
    if (!mobileAds) {
      return null;
    }

    this.unitId = unitId;
    this.ad = mobileAds.RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    this.listenerUnsubscribers = [
      this.ad.addAdEventListener(mobileAds.RewardedAdEventType.LOADED, () => {
        this.loaded = true;
      }),
      this.ad.addAdEventListener(mobileAds.AdEventType.CLOSED, () => {
        this.loaded = false;
        this.preload();
      }),
      this.ad.addAdEventListener(mobileAds.AdEventType.ERROR, () => {
        this.loaded = false;
      }),
    ];

    return this.ad;
  }

  preload(): void {
    if (!canShowAds() || !isRewardedAdsConfigured() || this.loaded || this.loadPromise) {
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

    this.loadPromise = new Promise<void>((resolve) => {
      const unsubscribeLoaded = ad.addAdEventListener(mobileAds.RewardedAdEventType.LOADED, () => {
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
    }).finally(() => {
      this.loadPromise = null;
    });
  }

  async showForReward(): Promise<boolean> {
    if (!canShowAds() || !isRewardedAdsConfigured()) {
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

    const mobileAds = loadMobileAdsModule();
    if (!mobileAds) {
      return false;
    }

    this.loaded = false;

    return new Promise((resolve) => {
      let finished = false;
      let earnedReward = false;

      const finish = (rewarded: boolean) => {
        if (finished) {
          return;
        }

        finished = true;
        unsubscribeEarnedReward();
        unsubscribeClosed();
        unsubscribeError();
        resolve(rewarded);
      };

      const unsubscribeEarnedReward = ad.addAdEventListener(
        mobileAds.RewardedAdEventType.EARNED_REWARD,
        () => {
          earnedReward = true;
          finish(true);
        },
      );
      const unsubscribeClosed = ad.addAdEventListener(mobileAds.AdEventType.CLOSED, () => {
        finish(earnedReward);
      });
      const unsubscribeError = ad.addAdEventListener(mobileAds.AdEventType.ERROR, () => {
        finish(false);
      });

      void ad.show().catch(() => {
        this.preload();
        finish(false);
      });
    });
  }
}

export const rewardedAdManager = new RewardedAdManager();

export function preloadRewardedAd(): void {
  rewardedAdManager.preload();
}

export function showRewardedForScoreReveal(): Promise<boolean> {
  return rewardedAdManager.showForReward();
}
