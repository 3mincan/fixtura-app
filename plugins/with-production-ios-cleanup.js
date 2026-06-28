const fs = require('node:fs');
const path = require('node:path');

const {
  withDangerousMod,
  withInfoPlist,
  withPodfileProperties,
} = require('expo/config-plugins');

const DEV_BUILD_PHASE_NAMES = [
  '[Expo Dev Launcher] Strip Local Network Keys for Release',
  '[Fixtura] Strip Dev Client Keys for Release',
];

const DEV_RESOURCE_MARKERS = [
  'expo-dev-launcher/EXDevLauncher.bundle',
  'expo-dev-menu/EXDevMenu.bundle',
  '/EXDevLauncher.bundle',
  '/EXDevMenu.bundle',
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeDevClientInfoPlistKeys(infoPlist) {
  if (Array.isArray(infoPlist.CFBundleURLTypes)) {
    infoPlist.CFBundleURLTypes = infoPlist.CFBundleURLTypes.filter((entry) => {
      const schemes = entry.CFBundleURLSchemes ?? [];
      return !schemes.some((scheme) => String(scheme).startsWith('exp+'));
    });

    if (infoPlist.CFBundleURLTypes.length === 0) {
      delete infoPlist.CFBundleURLTypes;
    }
  }

  if (Array.isArray(infoPlist.NSBonjourServices)) {
    infoPlist.NSBonjourServices = infoPlist.NSBonjourServices.filter(
      (service) => !String(service).includes('_expo._tcp'),
    );

    if (infoPlist.NSBonjourServices.length === 0) {
      delete infoPlist.NSBonjourServices;
    }
  }

  if (String(infoPlist.NSLocalNetworkUsageDescription ?? '').includes('Expo Dev Launcher')) {
    delete infoPlist.NSLocalNetworkUsageDescription;
  }

  return infoPlist;
}

function stripDevArtifactsFromPbxproj(contents) {
  let next = contents;

  for (const phaseName of DEV_BUILD_PHASE_NAMES) {
    const refPattern = new RegExp(
      `\t+([A-F0-9]{24}) \\/\\* ${escapeRegExp(phaseName)} \\*\\/,\\n`,
      'g',
    );
    const phaseIds = [...next.matchAll(refPattern)].map((match) => match[1]);

    next = next.replace(refPattern, '');

    for (const phaseId of phaseIds) {
      const blockPattern = new RegExp(
        `\t\t${phaseId} \\/\\* ${escapeRegExp(phaseName)} \\*\\/ = \\{[\\s\\S]*?\\n\\t\\t\\};\\n`,
        'g',
      );
      next = next.replace(blockPattern, '');
    }
  }

  for (const marker of DEV_RESOURCE_MARKERS) {
    next = next.replace(new RegExp(`^\t+.*${escapeRegExp(marker)}.*,\\n`, 'gm'), '');
  }

  return next;
}

function withProductionIosCleanup(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults = removeDevClientInfoPlistKeys(config.modResults);
    return config;
  });

  config = withPodfileProperties(config, (config) => {
    delete config.modResults.EX_DEV_CLIENT_NETWORK_INSPECTOR;
    return config;
  });

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const pbxprojPath = path.join(
        projectRoot,
        `${config.modRequest.projectName}.xcodeproj`,
        'project.pbxproj',
      );

      if (fs.existsSync(pbxprojPath)) {
        const original = fs.readFileSync(pbxprojPath, 'utf8');
        const cleaned = stripDevArtifactsFromPbxproj(original);

        if (cleaned !== original) {
          fs.writeFileSync(pbxprojPath, cleaned);
        }
      }

      return config;
    },
  ]);
}

module.exports = withProductionIosCleanup;
module.exports.removeDevClientInfoPlistKeys = removeDevClientInfoPlistKeys;
module.exports.stripDevArtifactsFromPbxproj = stripDevArtifactsFromPbxproj;
