import { useEffect, useState, type ComponentType } from 'react';

import { areAdsEnabled, getBannerUnitId } from '@/ads/ad-units';
import { canShowAds } from '@/ads/native-ads';
import { useAppStore } from '@/store/app-store';

type AdBannerSlotProps = {
  placement: 'home' | 'matchday';
};

export function AdBannerSlot({ placement }: AdBannerSlotProps) {
  const [BannerComponent, setBannerComponent] = useState<ComponentType<AdBannerSlotProps> | null>(
    null,
  );
  const remoteConfig = useAppStore((state) => state.remoteConfig);
  const adsEnabled = remoteConfig?.adsEnabled !== false;

  useEffect(() => {
    let mounted = true;

    if (!canShowAds()) {
      return () => {
        mounted = false;
      };
    }

    void import('@/components/ad-banner-native')
      .then(({ AdBannerNative }) => {
        if (mounted) {
          setBannerComponent(() => AdBannerNative);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  if (!adsEnabled || !areAdsEnabled() || !BannerComponent) {
    return null;
  }

  return <BannerComponent key={getBannerUnitId()} placement={placement} />;
}
