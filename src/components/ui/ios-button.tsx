import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Layout } from '@/theme/tokens';
import { useTheme } from '@/hooks/use-theme';

type IosButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'tinted' | 'plain';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IosButton({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  style,
}: IosButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === 'filled' && { backgroundColor: theme.accent },
        variant === 'tinted' && {
          backgroundColor: theme.accentMuted,
          borderColor: theme.accent,
        },
        variant === 'plain' && styles.plain,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text
        style={[
          styles.label,
          variant === 'filled' && styles.filledLabel,
          variant === 'tinted' && { color: theme.accent },
          variant === 'plain' && { color: theme.accent },
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.86}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Layout.buttonHeight,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  plain: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.985 }],
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  filledLabel: {
    color: '#FFFFFF',
  },
});
