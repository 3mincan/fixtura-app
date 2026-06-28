export type RemoteAdPlatformConfig = {
  bannerUnitId?: string;
  interstitialUnitId?: string;
  rewardedUnitId?: string;
};

export type RemoteConfig = {
  minSupportedAppVersion?: string;
  maintenanceMode?: boolean;
  aiProxyEnabled?: boolean;
  adsEnabled?: boolean;
  adMob?: {
    ios?: RemoteAdPlatformConfig;
    android?: RemoteAdPlatformConfig;
  };
  supportedTournaments?: string[];
};
