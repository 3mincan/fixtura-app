import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';
import iosPrivacyManifest from './ios-privacy-manifest.json';

type ExpoConfigWithExtra = ExpoConfig & {
  extra?: Record<string, unknown>;
};

const ADMOB_IOS_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? 'ca-app-pub-8524608486958068~3120395033';
const ADMOB_ANDROID_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713';
const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? 'https://api.fixtura.xyz';
const GTM_CONTAINER_ID =
  process.env.EXPO_PUBLIC_GTM_CONTAINER_ID ?? 'GTM-K8KV7BCB';
const APP_VARIANT = process.env.APP_VARIANT ?? 'development';
const IS_DEV_CLIENT_ENABLED = APP_VARIANT === 'development';

const appExpoConfig = appJson.expo as ExpoConfigWithExtra;
const appPlugins = (appExpoConfig.plugins ?? []) as NonNullable<ExpoConfig['plugins']>;
const appIos = appExpoConfig.ios ?? {};
const devClientPlugins = IS_DEV_CLIENT_ENABLED
  ? (['expo-dev-client', './plugins/with-strip-dev-client-release.js'] as const)
  : ([] as const);
const productionCleanupPlugins = IS_DEV_CLIENT_ENABLED
  ? ([] as const)
  : (['./plugins/with-production-ios-cleanup.js'] as const);
const sharedNativePlugins = ['./plugins/with-app-variant-podfile.js'] as const;

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  ...appExpoConfig,
  ios: {
    ...appIos,
    privacyManifests: iosPrivacyManifest,
  },
  plugins: [
    ...appPlugins,
    'expo-asset',
    ...devClientPlugins,
    ...sharedNativePlugins,
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
      },
    ],
    'expo-font',
    'expo-image',
    'expo-localization',
    './plugins/with-ios-localizations.js',
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: ADMOB_IOS_APP_ID,
        androidAppId: ADMOB_ANDROID_APP_ID,
        delayAppMeasurementInit: true,
      },
    ],
    ...productionCleanupPlugins,
    './plugins/with-playback-only-audio-permissions.js',
  ],
  extra: {
    ...config.extra,
    ...appExpoConfig.extra,
    appVariant: APP_VARIANT,
    backendBaseUrl: BACKEND_BASE_URL,
    gtmContainerId: GTM_CONTAINER_ID,
  },
});
