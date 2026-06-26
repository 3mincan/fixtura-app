import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { InsetPanel } from '@/components/ui/inset-panel';
import { useTheme } from '@/hooks/use-theme';

type StatePanelProps = {
  title: string;
  message: string;
  variant?: 'empty' | 'error';
  children?: ReactNode;
};

export function StatePanel({
  title,
  message,
  variant = 'empty',
  children,
}: StatePanelProps) {
  const theme = useTheme();

  return (
    <InsetPanel accentColor={variant === 'error' ? theme.danger : undefined}>
      <ThemedText type="headline">{title}</ThemedText>
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {children ? <View style={styles.children}>{children}</View> : null}
    </InsetPanel>
  );
}

const styles = StyleSheet.create({
  message: {
    lineHeight: 18,
  },
  children: {
    marginTop: 4,
  },
});
