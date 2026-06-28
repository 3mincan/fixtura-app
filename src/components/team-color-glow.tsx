import { LinearGradient } from 'expo-linear-gradient';
import type { CSSProperties, ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radii } from '@/theme/tokens';
import {
  buildTeamHalfGradientColors,
  getMatchCardTeamGlowColors,
  TEAM_HALF_GRADIENT_LOCATIONS,
} from '@/utils/team-color-glow';

type MatchCardTeamBackgroundProps = {
  homeTeamId: string;
  awayTeamId: string;
  cardColor: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

function getHalfGradientCss(teamColor: string, direction: 'home' | 'away'): string {
  const colors = buildTeamHalfGradientColors(teamColor, direction);

  return `linear-gradient(90deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
}

type WebBackgroundImageStyle = Pick<CSSProperties, 'backgroundImage'>;

function webBackgroundImageStyle(backgroundImage: string): ViewStyle {
  const style: WebBackgroundImageStyle = { backgroundImage };

  return style as ViewStyle;
}

function TeamHalfGlow({
  teamColor,
  direction,
}: {
  teamColor: string;
  direction: 'home' | 'away';
}) {
  const colors = buildTeamHalfGradientColors(teamColor, direction);

  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.halfOverlay,
          direction === 'home' ? styles.leftHalf : styles.rightHalf,
          webBackgroundImageStyle(getHalfGradientCss(teamColor, direction)),
        ]}
      />
    );
  }

  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors as [string, string, string]}
      locations={[...TEAM_HALF_GRADIENT_LOCATIONS]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.halfOverlay, direction === 'home' ? styles.leftHalf : styles.rightHalf]}
    />
  );
}

export function MatchCardTeamBackground({
  homeTeamId,
  awayTeamId,
  cardColor,
  style,
  children,
}: MatchCardTeamBackgroundProps) {
  const { home, away } = getMatchCardTeamGlowColors(homeTeamId, awayTeamId);

  return (
    <View style={[styles.background, style, { backgroundColor: cardColor }]}>
      <TeamHalfGlow teamColor={home} direction="home" />
      <TeamHalfGlow teamColor={away} direction="away" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** @deprecated Use MatchCardTeamBackground */
export const TeamColorGlow = MatchCardTeamBackground;

const styles = StyleSheet.create({
  background: {
    borderRadius: Radii.grouped,
    overflow: 'hidden',
    position: 'relative',
  },
  halfOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  leftHalf: {
    left: 0,
  },
  rightHalf: {
    right: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
