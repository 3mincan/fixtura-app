import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Layout, Radii } from '@/theme/tokens';

type GroupedSectionProps = {
  title?: string;
  footer?: string;
  children: ReactNode;
};

export function GroupedSection({ title, footer, children }: GroupedSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      {title ? (
        <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionTitle}>
          {title}
        </ThemedText>
      ) : null}

      <View
        style={[
          styles.group,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        {children}
      </View>

      {footer ? (
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.sectionFooter}>
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

type GroupedRowProps = {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showSeparator?: boolean;
};

export function GroupedRow({
  label,
  children,
  onPress,
  destructive = false,
  showSeparator = true,
}: GroupedRowProps) {
  const theme = useTheme();

  const row = (
    <>
      {label ? (
        <ThemedText
          type="body"
          style={destructive ? { color: theme.danger } : undefined}
          numberOfLines={1}>
          {label}
        </ThemedText>
      ) : null}
      {children}
    </>
  );

  return (
    <>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          accessibilityRole="button">
          {row}
        </Pressable>
      ) : (
        <View style={styles.row}>{row}</View>
      )}
      {showSeparator ? (
        <View style={[styles.separator, { backgroundColor: theme.separator }]} />
      ) : null}
    </>
  );
}

export function GroupedRowContent({ children }: { children: ReactNode }) {
  return <View style={styles.rowContent}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: Layout.groupedHorizontal,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionFooter: {
    marginTop: 8,
    marginHorizontal: Layout.groupedHorizontal,
    lineHeight: 18,
  },
  group: {
    marginHorizontal: Layout.groupedHorizontal,
    borderRadius: Radii.grouped,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: Layout.rowMinHeight,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  pressed: {
    opacity: 0.55,
  },
});
