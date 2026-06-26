#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "→ Stopping any existing Metro on :8081"
npm run kill:metro >/dev/null 2>&1 || true

echo "→ Starting Metro (LAN mode for physical device)"
NODE_OPTIONS=--dns-result-order=ipv4first npx expo start --dev-client --lan &
METRO_PID=$!

cleanup() {
  kill "$METRO_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

sleep 4

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
echo ""
echo "Metro should be at: http://${LAN_IP}:8081"
echo "→ Building and installing on device (USB recommended if wireless hangs)"
echo ""

NODE_OPTIONS=--dns-result-order=ipv4first npx expo run:ios --device --no-bundler || INSTALL_EXIT=$?

echo ""
if [[ "${INSTALL_EXIT:-0}" -ne 0 ]]; then
  cat <<'EOF'
⚠ Launch failed. Common fixes:

1. Trust developer on iPhone:
   Settings → General → VPN & Device Management
   → Developer App → Apple Development → Trust

2. Use USB (not wireless) and run: npm run ios:install

3. Start Metro before opening the app:
   npm run start:device
EOF
  exit "${INSTALL_EXIT}"
fi

echo "If the app closes immediately on the phone, trust the developer certificate (see above)."
echo "Metro must be running: npm run start:device"
