import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { StyleSheet, View } from 'react-native';

import { getBannerUnitId } from '@/ads/ad-units';

type AdBannerNativeProps = {
  placement: 'home' | 'matchday';
};

export function AdBannerNative({ placement }: AdBannerNativeProps) {
  return (
    <View style={[styles.container, placement === 'matchday' && styles.matchday]}>
      <BannerAd
        unitId={getBannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  matchday: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84, 84, 88, 0.35)',
  },
});
