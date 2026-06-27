import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type SplashScheme = 'dark' | 'light';

const SPLASH_FRAME_COUNT = 74;
const SPLASH_FPS = 15;
const SPLASH_DURATION_MS = Math.round((SPLASH_FRAME_COUNT / SPLASH_FPS) * 1000);
const SPLASH_FALLBACK_MS = SPLASH_DURATION_MS + 500;

const SPLASH_SOURCES = {
  dark: require('@/assets/images/fixtura-dark.json'),
  light: require('@/assets/images/fixtura-light.json'),
} as const;

const SPLASH_BACKGROUNDS: Record<SplashScheme, string> = {
  dark: '#000000',
  light: '#FFFFFF',
};

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

function resolveSplashScheme(colorScheme: ReturnType<typeof useColorScheme>): SplashScheme {
  return colorScheme === 'light' ? 'light' : 'dark';
}

export function FixturaSplashOverlay() {
  const scheme = resolveSplashScheme(useColorScheme());
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);
  const progress = useSharedValue(0);

  const animationSize = screenHeight;

  const finish = useCallback(() => {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    void SplashScreen.hideAsync();
    setVisible(false);
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    progress: progress.value,
  }));

  useEffect(() => {
    void SplashScreen.hideAsync();

    progress.value = withTiming(1, { duration: SPLASH_DURATION_MS }, (completed) => {
      if (completed) {
        runOnJS(finish)();
      }
    });

    const timeout = setTimeout(finish, SPLASH_FALLBACK_MS);
    return () => clearTimeout(timeout);
  }, [finish, progress]);

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[styles.overlay, { backgroundColor: SPLASH_BACKGROUNDS[scheme] }]}
      pointerEvents="auto">
      <View style={[styles.stage, { width: screenWidth, height: screenHeight }]}>
        <AnimatedLottieView
          source={SPLASH_SOURCES[scheme]}
          animatedProps={animatedProps}
          autoPlay={false}
          loop={false}
          renderMode="AUTOMATIC"
          resizeMode="cover"
          onAnimationFailure={(error) => {
            console.warn('Fixtura splash Lottie failed', error);
            finish();
          }}
          style={[styles.animation, { width: animationSize, height: animationSize }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    overflow: 'hidden',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  animation: {
    position: 'absolute',
  },
});
