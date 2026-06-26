import type { RemoteConfig } from '../types.js';

export function getRemoteConfig(): RemoteConfig {
  return {
    minSupportedAppVersion: '1.0.0',
    maintenanceMode: false,
    aiProxyEnabled: true,
    adsEnabled: true,
    supportedTournaments: ['world-cup-2026'],
  };
}
