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

  if (!BannerComponent) {
    return null;
  }

  return <BannerComponent placement={placement} />;
}
