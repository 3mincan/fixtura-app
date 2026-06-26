#!/usr/bin/env bash
set -euo pipefail

APP_PATH=$(find "$HOME/Library/Developer/Xcode/DerivedData" -path '*/Fixtura-*/Build/Products/Debug-iphoneos/Fixtura.app' -type d 2>/dev/null | head -1)

if [[ -z "$APP_PATH" ]]; then
  echo "No Debug-iphoneos build found. Run: npm run ios:device" >&2
  exit 1
fi

# devicectl uses Core Device UUID (not the USB UDID expo shows).
DEVICE_ID=$(
  xcrun devicectl list devices 2>/dev/null \
    | grep -E 'paired|connected' \
    | grep -Eo '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}' \
    | head -1
)

if [[ -z "$DEVICE_ID" ]]; then
  echo "No paired iPhone found. Connect via USB, unlock the phone, and trust this Mac." >&2
  xcrun devicectl list devices 2>/dev/null || true
  exit 1
fi

echo "Installing $APP_PATH"
echo "Device: $DEVICE_ID"
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

cat <<'EOF'

✔ Fixtura installed.

If Expo shows a launch Security error, the install still succeeded — open Fixtura manually on the phone.

Required on iPhone (one time):
  Settings → General → VPN & Device Management
  → Developer App → Apple Development → Trust

Then start Metro and open the app:
  npm run start:device
EOF
