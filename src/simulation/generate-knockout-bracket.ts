import {
  DEFAULT_ROUND_OF_32_MAPPING,
  ROUND_OF_32_MATCH_COUNT,
  ROUND_OF_32_TEAM_COUNT,
  type RoundOf32Mapping,
} from '@/simulation/knockout-bracket-mapping';
import type { KnockoutBracketMatch } from '@/types/knockout';

export type GroupQualifier = {
  groupId: string;
  firstPlaceTeamId: string;
  secondPlaceTeamId: string;
};

export type GenerateKnockoutBracketInput = {
  groupQualifiers: GroupQualifier[];
  additionalTeamIds: string[];
  mapping?: RoundOf32Mapping;
};

export type GenerateKnockoutBracketOutput = {
  roundOf32: KnockoutBracketMatch[];
};

function buildSlotLookup(
  groupQualifiers: GroupQualifier[],
  additionalTeamIds: string[],
): Record<string, string> {
  const sortedQualifiers = [...groupQualifiers].sort((groupA, groupB) =>
    groupA.groupId.localeCompare(groupB.groupId),
  );
  const slots: Record<string, string> = {};

  for (const qualifier of sortedQualifiers) {
    slots[`${qualifier.groupId}1`] = qualifier.firstPlaceTeamId;
    slots[`${qualifier.groupId}2`] = qualifier.secondPlaceTeamId;
  }

  additionalTeamIds.forEach((teamId, index) => {
    slots[`ADD-${index}`] = teamId;
  });

  const seededTeams = [
    ...sortedQualifiers.map((qualifier) => qualifier.firstPlaceTeamId),
    ...sortedQualifiers.map((qualifier) => qualifier.secondPlaceTeamId),
    ...additionalTeamIds,
  ];

  seededTeams.forEach((teamId, index) => {
    slots[`SEED-${index}`] = teamId;
  });

  return slots;
}

function validateInput(input: GenerateKnockoutBracketInput): void {
  const { groupQualifiers, additionalTeamIds, mapping = DEFAULT_ROUND_OF_32_MAPPING } = input;

  if (mapping.pairings.length !== ROUND_OF_32_MATCH_COUNT) {
    throw new Error(`Round of 32 mapping must contain ${ROUND_OF_32_MATCH_COUNT} pairings`);
  }

  const teamIds = [
    ...groupQualifiers.flatMap((qualifier) => [
      qualifier.firstPlaceTeamId,
      qualifier.secondPlaceTeamId,
    ]),
    ...additionalTeamIds,
  ];

  if (teamIds.length !== ROUND_OF_32_TEAM_COUNT) {
    throw new Error(
      `Expected ${ROUND_OF_32_TEAM_COUNT} teams for the Round of 32, received ${teamIds.length}`,
    );
  }

  const uniqueTeamIds = new Set(teamIds);

  if (uniqueTeamIds.size !== teamIds.length) {
    throw new Error('Round of 32 teams must be unique');
  }
}

function createRoundOf32MatchId(slot: number): string {
  return `r32-${slot}`;
}

export function generateKnockoutBracket(
  input: GenerateKnockoutBracketInput,
): GenerateKnockoutBracketOutput {
  validateInput(input);

  const { groupQualifiers, additionalTeamIds, mapping = DEFAULT_ROUND_OF_32_MAPPING } = input;
  const slotLookup = buildSlotLookup(groupQualifiers, additionalTeamIds);

  const roundOf32 = mapping.pairings.map((pairing, index) => {
    const homeTeamId = slotLookup[pairing.homeSlot];
    const awayTeamId = slotLookup[pairing.awaySlot];

    if (!homeTeamId || !awayTeamId) {
      throw new Error(`Unknown bracket slot in mapping: ${pairing.homeSlot} vs ${pairing.awaySlot}`);
    }

    const slot = index + 1;

    return {
      id: createRoundOf32MatchId(slot),
      round: 'round-of-32' as const,
      slot,
      homeTeamId,
      awayTeamId,
    };
  });

  return { roundOf32 };
}
