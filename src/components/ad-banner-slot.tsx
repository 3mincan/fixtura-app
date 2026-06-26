import { useEffect, useState, type ComponentType } from 'react';

import { canShowAds } from '@/ads/native-ads';

type AdBannerSlotProps = {
  placement: 'home' | 'matchday';
};

export function AdBannerSlot({ placement }: AdBannerSlotProps) {
  const [BannerComponent, setBannerComponent] = useState<ComponentType<AdBannerSlotProps> | null>(
    null,
  );

  useEffect(() => {
    if (!canShowAds()) {
      return;
    }

    void import('@/components/ad-banner-native').then(({ AdBannerNative }) => {
      setBannerComponent(() => AdBannerNative);
    });
  }, []);

  if (!BannerComponent) {
    return null;
  }

  return <BannerComponent placement={placement} />;
}
