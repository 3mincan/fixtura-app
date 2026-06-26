import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IosButton } from '@/components/ui/ios-button';
import type { GameSoundEffect } from '@/audio/game-sound-assets';
import { queueGameSoundEffect } from '@/store/game-audio-store';
import { teamsById } from '@/data/teams';
import { useTheme } from '@/hooks/use-theme';
import { Layout, Radii } from '@/theme/tokens';
import { getTeamColors, toRgba } from '@/utils/team-color-glow';

type ChampionCelebrationScreenProps = {
  teamId: string;
  onContinue: () => void;
  continueLabel?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  audioCue?: GameSoundEffect;
};

export function ChampionCelebrationScreen({
  teamId,
  onContinue,
  continueLabel,
  eyebrow,
  title,
  subtitle,
  audioCue,
}: ChampionCelebrationScreenProps) {
  const theme = useTheme();
  const team = teamsById[teamId];
  const colors = getTeamColors(teamId);
  const buttonLabel = continueLabel ?? 'Main menu';

  useEffect(() => {
    if (audioCue) {
      queueGameSoundEffect(audioCue);
    }
  }, [audioCue]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          toRgba(colors.primary, 0.42),
          toRgba(colors.secondary, 0.16),
          theme.background,
          theme.background,
        ]}
        locations={[0, 0.32, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.decorLayer}>
        <View style={[styles.orbitLine, styles.orbitLineTop, { borderColor: toRgba(colors.primary, 0.28) }]} />
        <View style={[styles.orbitLine, styles.orbitLineBottom, { borderColor: toRgba(colors.secondary, 0.22) }]} />
        <View style={[styles.slashLine, styles.slashLineLeft, { backgroundColor: toRgba(colors.primary, 0.2) }]} />
        <View style={[styles.slashLine, styles.slashLineRight, { backgroundColor: toRgba(colors.secondary, 0.18) }]} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Animated.View
            entering={FadeInUp.delay(120).duration(480)}
            style={[styles.heroCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.trophyStage}>
              <LinearGradient
                colors={[toRgba(colors.primary, 0.4), toRgba(colors.secondary, 0.16), 'transparent']}
                style={styles.trophyGlow}
              />
              <Animated.View entering={ZoomIn.delay(180).duration(420)} style={styles.trophyRing}>
                <Text style={styles.trophy}>🏆</Text>
              </Animated.View>
            </View>

            <Animated.View
              entering={FadeInDown.delay(280).duration(420)}
              style={[
                styles.flagHalo,
                {
                  backgroundColor: toRgba(colors.primary, 0.12),
                  borderColor: toRgba(colors.primary, 0.28),
                },
              ]}>
              <Text style={styles.flag}>{team.flagEmoji}</Text>
            </Animated.View>

            <ThemedText type="captionBold" themeColor="textSecondary" style={styles.eyebrow}>
              {eyebrow}
            </ThemedText>
            <ThemedText type="largeTitle" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText type="title2" style={[styles.teamName, { color: colors.primary }]}>
              {team.name}
            </ThemedText>
            <ThemedText type="subheadline" themeColor="textSecondary" style={styles.subtitle}>
              {subtitle}
            </ThemedText>

            <Animated.View entering={FadeIn.delay(520).duration(400)} style={styles.lineCluster}>
              <View style={[styles.shortLine, { backgroundColor: toRgba(colors.primary, 0.65) }]} />
              <View style={[styles.longLine, { backgroundColor: toRgba(colors.secondary, 0.5) }]} />
              <View style={[styles.shortLine, { backgroundColor: toRgba(colors.primary, 0.35) }]} />
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <IosButton label={buttonLabel} onPress={onContinue} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  orbitLine: {
    position: 'absolute',
    width: 420,
    height: 170,
    borderRadius: 210,
    borderWidth: StyleSheet.hairlineWidth * 2,
    transform: [{ rotate: '-18deg' }],
  },
  orbitLineTop: {
    top: 90,
    left: -95,
  },
  orbitLineBottom: {
    right: -120,
    bottom: 130,
  },
  slashLine: {
    position: 'absolute',
    width: 2,
    height: 150,
    borderRadius: 2,
    transform: [{ rotate: '32deg' }],
  },
  slashLineLeft: {
    left: 42,
    bottom: 120,
  },
  slashLineRight: {
    right: 54,
    top: 118,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Layout.groupedHorizontal,
  },
  heroCard: {
    borderRadius: Radii.grouped * 2,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    gap: 11,
    overflow: 'hidden',
  },
  trophyStage: {
    width: 150,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  trophyGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  trophyRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  trophy: {
    fontSize: 58,
  },
  flagHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  flag: {
    fontSize: 56,
  },
  eyebrow: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  title: {
    textAlign: 'center',
  },
  teamName: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  lineCluster: {
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  shortLine: {
    width: 42,
    height: 3,
    borderRadius: 3,
  },
  longLine: {
    width: 92,
    height: 3,
    borderRadius: 3,
  },
  footer: {
    paddingHorizontal: Layout.groupedHorizontal,
    paddingBottom: 16,
    paddingTop: 8,
  },
});
