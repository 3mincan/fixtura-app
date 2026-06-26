import { ScrollView, StyleSheet, View } from 'react-native';

import { formatGoalDifference, groupTableStyles } from '@/components/group-table-styles';
import { ThemedText } from '@/components/themed-text';
import { GroupedSection } from '@/components/ui/grouped-section';
import { teamsById } from '@/data/teams';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import {
  buildGroupTableRows,
  buildThirdPlaceRankingRows,
  getQualifiedThirdPlaceTeamIds,
  isGroupTableRowQualified,
  type GroupTableRow,
  type ThirdPlaceRankingRow,
} from '@/utils/group-standings';
import type { Standing } from '@/types/standing';

const TABLE_COLUMNS = [
  { key: 'position', label: 'Pos' },
  { key: 'team', label: 'Team' },
  { key: 'played', label: 'P' },
  { key: 'won', label: 'W' },
  { key: 'drawn', label: 'D' },
  { key: 'lost', label: 'L' },
  { key: 'goalDifference', label: 'GD' },
  { key: 'points', label: 'Pts' },
] as const;

const THIRD_PLACE_COLUMNS = [
  { key: 'position', label: 'Pos' },
  { key: 'team', label: 'Team' },
  { key: 'group', label: 'Grp' },
  { key: 'played', label: 'P' },
  { key: 'won', label: 'W' },
  { key: 'drawn', label: 'D' },
  { key: 'lost', label: 'L' },
  { key: 'goalDifference', label: 'GD' },
  { key: 'points', label: 'Pts' },
] as const;

type StandingsTableRowProps = {
  row: GroupTableRow;
  teamLabel: string;
  isSelectedTeam: boolean;
  isQualified: boolean;
  isLast: boolean;
};

function StandingsTableRow({
  row,
  teamLabel,
  isSelectedTeam,
  isQualified,
  isLast,
}: StandingsTableRowProps) {
  const theme = useTheme();

  return (
    <>
      <View
        style={[
          groupTableStyles.tableRow,
          isSelectedTeam && { backgroundColor: theme.backgroundSelected },
          {
            borderLeftWidth: 3,
            borderLeftColor: isQualified ? theme.success : 'transparent',
          },
        ]}>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tablePositionCell]} type="caption">
          {row.position}
        </ThemedText>
        <ThemedText
          style={[groupTableStyles.tableCell, groupTableStyles.tableTeamCell]}
          type="captionBold"
          numberOfLines={1}>
          {teamLabel}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.played}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.won}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.drawn}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.lost}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {formatGoalDifference(row.goalDifference)}
        </ThemedText>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tablePointsCell]} type="captionBold">
          {row.points}
        </ThemedText>
      </View>
      {!isLast ? (
        <View style={[groupTableStyles.separator, { backgroundColor: theme.separator }]} />
      ) : null}
    </>
  );
}

type GroupStandingsTableProps = {
  groupId: string;
  rows: GroupTableRow[];
  selectedTeamId?: string | null;
  qualifiedThirdPlaceTeamIds: Set<string>;
};

export function GroupStandingsTable({
  groupId,
  rows,
  selectedTeamId = null,
  qualifiedThirdPlaceTeamIds,
}: GroupStandingsTableProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <GroupedSection title={t('groupTableGroupTitle', { groupId })}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={groupTableStyles.table}>
          <View style={[groupTableStyles.tableHeaderRow, { borderBottomColor: theme.separator }]}>
            {TABLE_COLUMNS.map((column) => (
              <ThemedText
                key={column.key}
                type="captionBold"
                themeColor="textSecondary"
                style={[
                  groupTableStyles.tableCell,
                  groupTableStyles.tableHeaderCell,
                  column.key === 'team' && groupTableStyles.tableTeamCell,
                  column.key === 'position' && groupTableStyles.tablePositionCell,
                  column.key === 'points' && groupTableStyles.tablePointsCell,
                ]}>
                {column.label}
              </ThemedText>
            ))}
          </View>

          {rows.map((row, index) => {
            const team = teamsById[row.teamId];

            return (
              <StandingsTableRow
                key={row.teamId}
                row={row}
                teamLabel={`${team.flagEmoji} ${team.shortName}`}
                isSelectedTeam={row.teamId === selectedTeamId}
                isQualified={isGroupTableRowQualified(row, qualifiedThirdPlaceTeamIds)}
                isLast={index === rows.length - 1}
              />
            );
          })}
        </View>
      </ScrollView>
    </GroupedSection>
  );
}

function ThirdPlaceTableRow({
  row,
  teamLabel,
  isSelectedTeam,
  isQualified,
  isLast,
}: {
  row: ThirdPlaceRankingRow;
  teamLabel: string;
  isSelectedTeam: boolean;
  isQualified: boolean;
  isLast: boolean;
}) {
  const theme = useTheme();

  return (
    <>
      <View
        style={[
          groupTableStyles.tableRow,
          isSelectedTeam && { backgroundColor: theme.backgroundSelected },
          {
            borderLeftWidth: 3,
            borderLeftColor: isQualified ? theme.success : 'transparent',
          },
        ]}>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tablePositionCell]} type="caption">
          {row.position}
        </ThemedText>
        <ThemedText
          style={[groupTableStyles.tableCell, groupTableStyles.tableTeamCell]}
          type="captionBold"
          numberOfLines={1}>
          {teamLabel}
        </ThemedText>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tableGroupCell]} type="captionBold">
          {row.groupId}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.played}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.won}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.drawn}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.lost}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {formatGoalDifference(row.goalDifference)}
        </ThemedText>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tablePointsCell]} type="captionBold">
          {row.points}
        </ThemedText>
      </View>
      {!isLast ? (
        <View style={[groupTableStyles.separator, { backgroundColor: theme.separator }]} />
      ) : null}
    </>
  );
}

function BestThirdPlaceTable({
  rows,
  selectedTeamId,
}: {
  rows: ThirdPlaceRankingRow[];
  selectedTeamId: string | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <GroupedSection title={t('bestThirdPlaceTitle')}>
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.thirdPlaceSubtitle}>
        {t('bestThirdPlaceSubtitle')}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={groupTableStyles.table}>
          <View style={[groupTableStyles.tableHeaderRow, { borderBottomColor: theme.separator }]}>
            {THIRD_PLACE_COLUMNS.map((column) => (
              <ThemedText
                key={column.key}
                type="captionBold"
                themeColor="textSecondary"
                style={[
                  groupTableStyles.tableCell,
                  groupTableStyles.tableHeaderCell,
                  column.key === 'team' && groupTableStyles.tableTeamCell,
                  column.key === 'position' && groupTableStyles.tablePositionCell,
                  column.key === 'group' && groupTableStyles.tableGroupCell,
                  column.key === 'points' && groupTableStyles.tablePointsCell,
                ]}>
                {column.label}
              </ThemedText>
            ))}
          </View>

          {rows.map((row, index) => {
            const team = teamsById[row.teamId];

            return (
              <ThirdPlaceTableRow
                key={`${row.groupId}-${row.teamId}`}
                row={row}
                teamLabel={`${team.flagEmoji} ${team.shortName}`}
                isSelectedTeam={row.teamId === selectedTeamId}
                isQualified={row.qualifies}
                isLast={index === rows.length - 1}
              />
            );
          })}
        </View>
      </ScrollView>
    </GroupedSection>
  );
}

type GroupStandingsSummaryProps = {
  groupStandings: Record<string, Standing[]>;
  selectedTeamId: string | null;
};

export function GroupStandingsSummary({
  groupStandings,
  selectedTeamId,
}: GroupStandingsSummaryProps) {
  const sortedGroupIds = Object.keys(groupStandings).sort((left, right) =>
    left.localeCompare(right),
  );
  const qualifiedThirdPlaceTeamIds = getQualifiedThirdPlaceTeamIds(groupStandings);
  const thirdPlaceRows = buildThirdPlaceRankingRows(groupStandings);

  if (sortedGroupIds.length === 0) {
    return null;
  }

  return (
    <View style={styles.summary}>
      {sortedGroupIds.map((groupId) => (
        <GroupStandingsTable
          key={groupId}
          groupId={groupId}
          rows={buildGroupTableRows(groupStandings[groupId]!)}
          selectedTeamId={selectedTeamId}
          qualifiedThirdPlaceTeamIds={qualifiedThirdPlaceTeamIds}
        />
      ))}
      <BestThirdPlaceTable rows={thirdPlaceRows} selectedTeamId={selectedTeamId} />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: 8,
  },
  thirdPlaceSubtitle: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
