import { StyleSheet } from 'react-native';

import { Layout, Radii } from '@/theme/tokens';

export function formatGoalDifference(goalDifference: number): string {
  if (goalDifference > 0) {
    return `+${goalDifference}`;
  }

  return String(goalDifference);
}

export const groupTableStyles = StyleSheet.create({
  table: {
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    gap: 8,
    minHeight: Layout.rowMinHeight,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 12,
  },
  tableCell: {
    width: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  tableHeaderCell: {
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tablePositionCell: {
    width: 36,
  },
  tableTeamCell: {
    width: 120,
    textAlign: 'left',
  },
  tablePointsCell: {
    width: 36,
  },
  tableGroupCell: {
    width: 36,
    textAlign: 'center',
  },
  tableGoalsCell: {
    width: 32,
  },
});
