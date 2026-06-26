import { DEFAULT_TEAM_COLORS, teamColorsById } from '@/data/team-colors';

const PRIMARY_SIMILARITY_THRESHOLD = 72;

/** Each team half: center 0%, midpoint of half 25%, outer edge 100%. */
export const TEAM_HALF_GRADIENT_LOCATIONS = [0, 0.5, 1] as const;
export const TEAM_HALF_GRADIENT_ALPHAS = [1, 0.25, 0] as const;

export function buildTeamHalfGradientColors(
  teamColor: string,
  direction: 'home' | 'away',
): string[] {
  const alphas =
    direction === 'home'
      ? [...TEAM_HALF_GRADIENT_ALPHAS]
      : [...TEAM_HALF_GRADIENT_ALPHAS].reverse();

  return alphas.map((alpha) => toRgba(teamColor, alpha));
}

type Rgb = {
  r: number;
  g: number;
  b: number;
};

export function getTeamColors(teamId: string) {
  return teamColorsById[teamId] ?? DEFAULT_TEAM_COLORS;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '');

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getColorDistance(left: string, right: string): number {
  const a = hexToRgb(left);
  const b = hexToRgb(right);

  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function areTeamPrimaryColorsSimilar(leftTeamId: string, rightTeamId: string): boolean {
  const left = getTeamColors(leftTeamId).primary;
  const right = getTeamColors(rightTeamId).primary;

  return getColorDistance(left, right) < PRIMARY_SIMILARITY_THRESHOLD;
}

export function resolveAwayTeamGlowColor(homeTeamId: string, awayTeamId: string): string {
  const awayColors = getTeamColors(awayTeamId);

  if (areTeamPrimaryColorsSimilar(homeTeamId, awayTeamId)) {
    return awayColors.secondary;
  }

  return awayColors.primary;
}

export function getHomeTeamGlowColor(homeTeamId: string): string {
  return getTeamColors(homeTeamId).primary;
}

export function getMatchCardTeamGlowColors(homeTeamId: string, awayTeamId: string) {
  return {
    home: getHomeTeamGlowColor(homeTeamId),
    away: resolveAwayTeamGlowColor(homeTeamId, awayTeamId),
  };
}
