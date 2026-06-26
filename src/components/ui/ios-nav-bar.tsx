import { SymbolView } from 'expo-symbols';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/theme/tokens';
import { useTheme } from '@/hooks/use-theme';

type IosNavBarProps = {
  title?: string;
  backLabel?: string;
  onBack?: () => void;
  trailing?: ReactNode;
};

export function IosNavBar({ title, backLabel, onBack, trailing }: IosNavBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.bar}>
      <View style={styles.leading}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.accentMuted },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={17}
              weight="semibold"
              tintColor={theme.accent}
            />
            {backLabel ? (
              <ThemedText type="body" style={{ color: theme.accent }}>
                {backLabel}
              </ThemedText>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {title ? (
        <ThemedText type="headline" style={styles.inlineTitle} numberOfLines={1}>
          {title}
        </ThemedText>
      ) : null}

      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenHorizontal,
  },
  leading: {
    flex: 1,
    alignItems: 'flex-start',
  },
  trailing: {
    flex: 1,
    alignItems: 'flex-end',
  },
  inlineTitle: {
    position: 'absolute',
    left: 72,
    right: 72,
    textAlign: 'center',
  },
  backButton: {
    minHeight: 36,
    minWidth: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingLeft: 9,
    paddingRight: 12,
  },
  pressed: {
    opacity: 0.55,
  },
});
