const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');

const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'es', 'ar', 'ja', 'zh', 'id', 'pt', 'fr'];

function copyLocalizations(projectRoot, iosProjectRoot) {
  const sourceRoot = path.join(projectRoot, 'localizations');

  if (!fs.existsSync(sourceRoot)) {
    return;
  }

  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.lproj')) {
      continue;
    }

    const sourceDir = path.join(sourceRoot, entry.name);
    const targetDir = path.join(iosProjectRoot, entry.name);

    fs.mkdirSync(targetDir, { recursive: true });

    for (const fileName of fs.readdirSync(sourceDir)) {
      fs.copyFileSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));
    }
  }
}

function withIosLocalizations(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleDevelopmentRegion = 'en';
    config.modResults.CFBundleLocalizations = SUPPORTED_LANGUAGES;

    return config;
  });

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      copyLocalizations(config.modRequest.projectRoot, config.modRequest.platformProjectRoot);

      return config;
    },
  ]);
}

module.exports = withIosLocalizations;
