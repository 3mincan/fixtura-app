const { withInfoPlist } = require('expo/config-plugins');

function withPlaybackOnlyAudioPermissions(config) {
  return withInfoPlist(config, (config) => {
    delete config.modResults.NSMicrophoneUsageDescription;

    if (Array.isArray(config.modResults.UIBackgroundModes)) {
      config.modResults.UIBackgroundModes = config.modResults.UIBackgroundModes.filter(
        (mode) => mode !== 'audio',
      );

      if (config.modResults.UIBackgroundModes.length === 0) {
        delete config.modResults.UIBackgroundModes;
      }
    }

    return config;
  });
}

module.exports = withPlaybackOnlyAudioPermissions;
