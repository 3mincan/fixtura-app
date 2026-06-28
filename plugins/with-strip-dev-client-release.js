const { withXcodeProject } = require('expo/config-plugins');

const BUILD_PHASE_NAME = '[Fixtura] Strip Dev Client Keys for Release';

/**
 * Removes dev-client URL schemes from Release archives.
 * Expo Dev Launcher already strips Bonjour/local-network keys on non-Debug builds;
 * this covers the generated exp+{slug} deep link scheme.
 */
function withStripDevClientRelease(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targetName = config.modRequest.projectName;
    const nativeTargetId = project.findTargetKey(targetName ?? '');

    if (!nativeTargetId) {
      console.warn(
        `[Fixtura] Could not find target "${targetName}" to add dev-client strip build phase`,
      );
      return config;
    }

    const buildPhases = project.pbxNativeTargetSection()[nativeTargetId]?.buildPhases ?? [];
    const existingPhase = buildPhases.find((phase) => phase.comment === BUILD_PHASE_NAME);
    if (existingPhase) {
      return config;
    }

    project.addBuildPhase([], 'PBXShellScriptBuildPhase', BUILD_PHASE_NAME, nativeTargetId, {
      shellPath: '/bin/sh',
      shellScript: `# Strip dev-client deep link schemes from non-Debug builds.
if [ "$CONFIGURATION" = "Debug" ]; then
  exit 0
fi

PLIST_PATH="\${TARGET_BUILD_DIR}/\${INFOPLIST_PATH}"
if [ ! -f "$PLIST_PATH" ]; then
  exit 0
fi

if ! /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST_PATH" >/dev/null 2>&1; then
  exit 0
fi

COUNT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST_PATH" 2>/dev/null | grep "^    Dict {" | wc -l | tr -d ' ')
for ((i=COUNT-1; i>=0; i--)); do
  SCHEMES=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes:$i:CFBundleURLSchemes" "$PLIST_PATH" 2>/dev/null || echo "")
  if echo "$SCHEMES" | grep -q "exp+"; then
    /usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes:$i" "$PLIST_PATH" 2>/dev/null || true
  fi
done

REMAINING=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST_PATH" 2>/dev/null | grep "^    Dict {" | wc -l | tr -d ' ')
if [ "$REMAINING" -eq "0" ]; then
  /usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes" "$PLIST_PATH" 2>/dev/null || true
fi
`,
    });

    return config;
  });
}

module.exports = withStripDevClientRelease;
