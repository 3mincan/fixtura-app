const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod } = require('expo/config-plugins');

const PODFILE_MARKER = '# @fixtura/app-variant-autolinking';

function withAppVariantPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const patchedBlock = `${PODFILE_MARKER}
  use_expo_modules!(
    exclude: ENV['APP_VARIANT'] == 'production' ? [
      'expo-dev-client',
      'expo-dev-launcher',
      'expo-dev-menu',
      'expo-dev-menu-interface',
    ] : [],
  )`;

      if (contents.includes(PODFILE_MARKER)) {
        contents = contents.replace(
          /# @fixtura\/app-variant-autolinking[\s\S]*?\n  \)/,
          patchedBlock,
        );
      } else if (contents.includes('use_expo_modules!')) {
        contents = contents.replace('use_expo_modules!', patchedBlock);
      } else {
        throw new Error('Expected use_expo_modules! in Podfile');
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = withAppVariantPodfile;
