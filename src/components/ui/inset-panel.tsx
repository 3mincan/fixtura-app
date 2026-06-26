import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radii } from '@/theme/tokens';

type InsetPanelProps = {
  children: ReactNode;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function InsetPanel({ children, accentColor, style }: InsetPanelProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radii.grouped,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
});
