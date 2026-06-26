import { groups } from '@/data/groups';
import type { Standing } from '@/types/standing';

const BEST_THIRD_PLACE_COUNT = 8;

function compareStandingEntries(teamA: Standing, teamB: Standing): number {
  if (teamA.points !== teamB.points) {
    return teamB.points - teamA.points;
  }

  if (teamA.goalDifference !== teamB.goalDifference) {
    return teamB.goalDifference - teamA.goalDifference;
  }

  if (teamA.goalsFor !== teamB.goalsFor) {
    return teamB.goalsFor - teamA.goalsFor;
  }

  return teamA.teamId.localeCompare(teamB.teamId);
}

export function selectBestThirdPlaceTeams(
  standings: Record<string, Standing[]>,
): { teamId: string; groupId: string }[] {
  const thirdPlaceTeams = groups.map((group) => ({
    groupId: group.id,
    standing: standings[group.id][2],
  }));

  return [...thirdPlaceTeams]
    .sort((teamA, teamB) => compareStandingEntries(teamA.standing, teamB.standing))
    .slice(0, BEST_THIRD_PLACE_COUNT)
    .map((entry) => ({
      groupId: entry.groupId,
      teamId: entry.standing.teamId,
    }));
}

type ParsedPlaceholder =
  | { type: 'group-position'; groupId: string; position: 1 | 2 }
  | { type: 'third-place'; eligibleGroups: string[] };

export function parseKnockoutPlaceholder(token: string): ParsedPlaceholder {
  const groupPositionMatch = token.match(/^([12])([A-L])$/);

  if (groupPositionMatch) {
    return {
      type: 'group-position',
      position: Number(groupPositionMatch[1]) as 1 | 2,
      groupId: groupPositionMatch[2]!,
    };
  }

  if (token.startsWith('3')) {
    return {
      type: 'third-place',
      eligibleGroups: token.slice(1).split('/').filter(Boolean),
    };
  }

  throw new Error(`Unsupported knockout placeholder: ${token}`);
}

export function resolveGroupPositionPlaceholder(
  token: string,
  standings: Record<string, Standing[]>,
): string {
  const placeholder = parseKnockoutPlaceholder(token);

  if (placeholder.type !== 'group-position') {
    throw new Error(`Expected group position placeholder: ${token}`);
  }

  const standing = standings[placeholder.groupId]?.[placeholder.position - 1];

  if (!standing) {
    throw new Error(`Missing standing for ${token}`);
  }

  return standing.teamId;
}

export type ThirdPlaceSlot = {
  key: string;
  eligibleGroups: string[];
};

export function assignThirdPlaceTeams(
  slots: ThirdPlaceSlot[],
  qualifiedThirdPlaces: { teamId: string; groupId: string }[],
): Record<string, string> {
  const assignments: Record<string, string> = {};
  const assignedGroups = new Set<string>();

  function solve(slotIndex: number): boolean {
    if (slotIndex >= slots.length) {
      return true;
    }

    const slot = slots[slotIndex]!;

    for (const candidate of qualifiedThirdPlaces) {
      if (assignedGroups.has(candidate.groupId)) {
        continue;
      }

      if (!slot.eligibleGroups.includes(candidate.groupId)) {
        continue;
      }

      assignments[slot.key] = candidate.teamId;
      assignedGroups.add(candidate.groupId);

      if (solve(slotIndex + 1)) {
        return true;
      }

      delete assignments[slot.key];
      assignedGroups.delete(candidate.groupId);
    }

    return false;
  }

  if (!solve(0)) {
    throw new Error('Unable to assign third-place teams to knockout fixtures');
  }

  return assignments;
}

export function resolveKnockoutPlaceholder(
  token: string,
  standings: Record<string, Standing[]>,
  thirdPlaceAssignments: Record<string, string>,
  slotKey?: string,
): string {
  const placeholder = parseKnockoutPlaceholder(token);

  if (placeholder.type === 'group-position') {
    return resolveGroupPositionPlaceholder(token, standings);
  }

  if (!slotKey || !thirdPlaceAssignments[slotKey]) {
    throw new Error(`Unable to resolve third-place placeholder: ${token}`);
  }

  return thirdPlaceAssignments[slotKey]!;
}
