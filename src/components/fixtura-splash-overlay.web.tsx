import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, useColorScheme, View } from 'react-native';

type SplashScheme = 'dark' | 'light';

const SPLASH_WEB_DURATION_MS = 700;

const SPLASH_IMAGES = {
  dark: require('@/assets/images/new/fixtura-dark.png'),
  light: require('@/assets/images/new/fixtura-light.png'),
} as const;

const SPLASH_BACKGROUNDS: Record<SplashScheme, string> = {
  dark: '#000000',
  light: '#FFFFFF',
};

function resolveSplashScheme(colorScheme: ReturnType<typeof useColorScheme>): SplashScheme {
  return colorScheme === 'light' ? 'light' : 'dark';
}

export function FixturaSplashOverlay() {
  const scheme = resolveSplashScheme(useColorScheme());
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    void SplashScreen.hideAsync();
    setVisible(false);
  }, []);

  useEffect(() => {
    void SplashScreen.hideAsync();

    const timeout = setTimeout(finish, SPLASH_WEB_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [finish]);

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="auto"
      style={[styles.overlay, { backgroundColor: SPLASH_BACKGROUNDS[scheme] }]}>
      <Image source={SPLASH_IMAGES[scheme]} resizeMode="contain" style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: {
    width: 220,
    height: 220,
  },
});
