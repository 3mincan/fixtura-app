const disableDevClient = process.env.APP_VARIANT === 'production';

const disabledDevClientPlatforms = {
  ios: null,
  android: null,
};

/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependencies: disableDevClient
    ? {
        'expo-dev-client': { platforms: disabledDevClientPlatforms },
        'expo-dev-launcher': { platforms: disabledDevClientPlatforms },
        'expo-dev-menu': { platforms: disabledDevClientPlatforms },
        'expo-dev-menu-interface': { platforms: disabledDevClientPlatforms },
      }
    : {},
};
