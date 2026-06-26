import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radii } from '@/theme/tokens';

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SettingsSegmentRowProps<T extends string> = {
  title: string;
  description: string;
  value: T;
  options: SegmentOption<T>[];
  onValueChange: (value: T) => void;
  embedded?: boolean;
};

export function SettingsSegmentRow<T extends string>({
  title,
  description,
  value,
  options,
  onValueChange,
  embedded = false,
}: SettingsSegmentRowProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.container, embedded && styles.embedded]}>
      <ThemedText type="body">{title}</ThemedText>
      {description ? (
        <ThemedText type="footnote" themeColor="textSecondary">
          {description}
        </ThemedText>
      ) : null}

      <View style={[styles.segmentRow, { backgroundColor: theme.background }]}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onValueChange(option.value)}
              style={[
                styles.segmentButton,
                isSelected && { backgroundColor: theme.backgroundElement },
              ]}>
              <ThemedText
                type="captionBold"
                style={{ color: isSelected ? theme.text : theme.textSecondary }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.grouped,
    padding: 16,
    gap: 8,
  },
  embedded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
    gap: 2,
    marginTop: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
});
