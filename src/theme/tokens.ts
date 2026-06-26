export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#3C3C43',
    textDim: '#8E8E93',
    background: '#F2F2F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: 'rgba(12, 92, 171, 0.12)',
    accent: '#0C5CAB',
    accentLight: '#1e7ae8',
    accentMuted: 'rgba(12, 92, 171, 0.12)',
    onAccent: '#FFFFFF',
    border: 'rgba(60, 60, 67, 0.18)',
    borderStrong: 'rgba(60, 60, 67, 0.29)',
    card: '#FFFFFF',
    cardHighlight: 'rgba(12, 92, 171, 0.08)',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    separator: 'rgba(60, 60, 67, 0.18)',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textDim: '#8E8E93',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: 'rgba(12, 92, 171, 0.24)',
    accent: '#0C5CAB',
    accentLight: '#1e7ae8',
    accentMuted: 'rgba(12, 92, 171, 0.28)',
    onAccent: '#FFFFFF',
    border: 'rgba(84, 84, 88, 0.65)',
    borderStrong: 'rgba(84, 84, 88, 0.85)',
    card: '#1C1C1E',
    cardHighlight: 'rgba(12, 92, 171, 0.18)',
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    separator: 'rgba(84, 84, 88, 0.65)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: 0 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: 0 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: 0 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const, letterSpacing: 0 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0 },
  captionBold: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0 },
} as const;

export const Radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  grouped: 10,
} as const;

export const Layout = {
  screenHorizontal: 20,
  groupedHorizontal: 16,
  rowMinHeight: 44,
  buttonHeight: 52,
  maxContentWidth: 840,
} as const;
