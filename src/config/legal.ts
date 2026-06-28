export const DEFAULT_MARKETING_URL = 'https://fixtura.xyz';
export const DEFAULT_PRIVACY_POLICY_URL = 'https://fixtura.xyz/privacy';
export const DEFAULT_SUPPORT_URL = 'https://fixtura.xyz/support';
export const DEFAULT_AD_REPORT_EMAIL = 'support@fixtura.xyz';

export const MARKETING_URL =
  process.env.EXPO_PUBLIC_MARKETING_URL ?? DEFAULT_MARKETING_URL;

export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? DEFAULT_PRIVACY_POLICY_URL;

export const SUPPORT_URL =
  process.env.EXPO_PUBLIC_SUPPORT_URL ?? DEFAULT_SUPPORT_URL;

export const AD_REPORT_EMAIL =
  process.env.EXPO_PUBLIC_AD_REPORT_EMAIL ?? DEFAULT_AD_REPORT_EMAIL;
