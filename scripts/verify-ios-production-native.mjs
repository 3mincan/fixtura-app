import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { parse: parsePlist } = require('@expo/plist').default;

const root = process.cwd();
const appVariant = process.env.APP_VARIANT ?? 'production';

if (appVariant !== 'production') {
  console.log(`APP_VARIANT=${appVariant} — skipping production native verification`);
  process.exit(0);
}

const infoPath = path.join(root, 'ios/Fixtura/Info.plist');
const podfileLockPath = path.join(root, 'ios/Podfile.lock');
const pbxprojPath = path.join(root, 'ios/Fixtura.xcodeproj/project.pbxproj');
const podfilePropertiesPath = path.join(root, 'ios/Podfile.properties.json');

if (!existsSync(infoPath)) {
  console.log('ios/ not present — skipping production native verification');
  process.exit(0);
}

const infoPlist = parsePlist(readFileSync(infoPath, 'utf8'));
const urlTypes = infoPlist.CFBundleURLTypes ?? [];
const schemes = urlTypes.flatMap((entry) => entry.CFBundleURLSchemes ?? []);

assert.ok(
  !schemes.some((scheme) => String(scheme).startsWith('exp+')),
  `Info.plist still declares dev-client scheme(s): ${schemes.filter((s) => String(s).startsWith('exp+')).join(', ')}. Run: npm run ios:sync-native:production`,
);

const bonjourServices = infoPlist.NSBonjourServices ?? [];
assert.ok(
  !bonjourServices.some((service) => String(service).includes('_expo._tcp')),
  'Info.plist still declares _expo._tcp Bonjour service. Run: npm run ios:sync-native:production',
);

const localNetworkDescription = infoPlist.NSLocalNetworkUsageDescription ?? '';
assert.ok(
  !String(localNetworkDescription).includes('Expo Dev Launcher'),
  'Info.plist still declares Expo Dev Launcher local network usage text. Run: npm run ios:sync-native:production',
);

assert.equal(
  infoPlist.NSMicrophoneUsageDescription,
  undefined,
  'Info.plist must not request microphone access for playback-only audio. Run: npm run ios:sync-native:production',
);

const backgroundModes = infoPlist.UIBackgroundModes ?? [];
assert.ok(
  !backgroundModes.includes('audio'),
  'Info.plist must not declare UIBackgroundModes audio for foreground-only playback. Run: npm run ios:sync-native:production',
);

function hasTopLevelPod(podfileLock, podName) {
  return new RegExp(`^  - ${podName} \\(`, 'm').test(podfileLock);
}

if (existsSync(podfileLockPath)) {
  const podfileLock = readFileSync(podfileLockPath, 'utf8');
  for (const pod of [
    'expo-dev-client',
    'expo-dev-launcher',
    'expo-dev-menu',
    'expo-dev-menu-interface',
  ]) {
    assert.ok(
      !hasTopLevelPod(podfileLock, pod),
      `Podfile.lock still links ${pod}. Run: npm run ios:sync-native:production`,
    );
  }
}

if (existsSync(pbxprojPath)) {
  const pbxproj = readFileSync(pbxprojPath, 'utf8');
  const devProjectMarkers = [
    '[Expo Dev Launcher]',
    '[Fixtura] Strip Dev Client Keys for Release',
    'EXDevLauncher.bundle',
    'EXDevMenu.bundle',
    'expo-dev-launcher',
    'expo-dev-menu',
  ];

  for (const marker of devProjectMarkers) {
    assert.ok(
      !pbxproj.includes(marker),
      `Xcode project still references dev-client artifact "${marker}". Run: npm run ios:sync-native:production`,
    );
  }
}

if (existsSync(podfilePropertiesPath)) {
  const podfileProperties = JSON.parse(readFileSync(podfilePropertiesPath, 'utf8'));
  assert.ok(
    podfileProperties.EX_DEV_CLIENT_NETWORK_INSPECTOR !== 'true',
    'Podfile.properties.json still enables EX_DEV_CLIENT_NETWORK_INSPECTOR. Run: npm run ios:sync-native:production',
  );
}

console.log('Production iOS native project has no dev-client artifacts');
