import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateKnockoutBracket, type GroupQualifier } from '@/simulation/generate-knockout-bracket';
import {
  DEFAULT_ROUND_OF_32_MAPPING,
  ROUND_OF_32_MATCH_COUNT,
} from '@/simulation/knockout-bracket-mapping';

function makeGroupQualifiers(groupIds: string[]): GroupQualifier[] {
  return groupIds.map((groupId) => ({
    groupId,
    firstPlaceTeamId: `${groupId.toLowerCase()}-1`,
    secondPlaceTeamId: `${groupId.toLowerCase()}-2`,
  }));
}

const TWELVE_GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function makeFullBracketInput(additionalTeamIds = Array.from({ length: 8 }, (_, index) => `add-${index}`)) {
  return {
    groupQualifiers: makeGroupQualifiers(TWELVE_GROUP_IDS),
    additionalTeamIds,
  };
}

describe('generateKnockoutBracket', () => {
  it('generates 16 Round of 32 matches for 32 qualified teams', () => {
    const output = generateKnockoutBracket(makeFullBracketInput());

    assert.equal(output.roundOf32.length, ROUND_OF_32_MATCH_COUNT);
  });

  it('creates fixtures with resolved home and away teams', () => {
    const output = generateKnockoutBracket(makeFullBracketInput());

    for (const [index, match] of output.roundOf32.entries()) {
      assert.equal(match.round, 'round-of-32');
      assert.equal(match.slot, index + 1);
      assert.equal(match.id, `r32-${index + 1}`);
      assert.ok(match.homeTeamId);
      assert.ok(match.awayTeamId);
      assert.notEqual(match.homeTeamId, match.awayTeamId);
    }
  });

  it('uses each team exactly once across the Round of 32', () => {
    const input = makeFullBracketInput();
    const output = generateKnockoutBracket(input);
    const teamIds = output.roundOf32.flatMap((match) => [match.homeTeamId, match.awayTeamId]);
    const expectedTeamIds = [
      ...input.groupQualifiers.flatMap((qualifier) => [
        qualifier.firstPlaceTeamId,
        qualifier.secondPlaceTeamId,
      ]),
      ...input.additionalTeamIds,
    ];

    assert.equal(teamIds.length, 32);
    assert.equal(new Set(teamIds).size, 32);
    assert.deepEqual([...teamIds].sort(), [...expectedTeamIds].sort());
  });

  it('supports a configurable mapping', () => {
    const output = generateKnockoutBracket({
      ...makeFullBracketInput(),
      mapping: {
        pairings: [
          { homeSlot: 'A1', awaySlot: 'B2' },
          { homeSlot: 'B1', awaySlot: 'A2' },
          { homeSlot: 'C1', awaySlot: 'D2' },
          { homeSlot: 'D1', awaySlot: 'C2' },
          { homeSlot: 'E1', awaySlot: 'F2' },
          { homeSlot: 'F1', awaySlot: 'E2' },
          { homeSlot: 'G1', awaySlot: 'H2' },
          { homeSlot: 'H1', awaySlot: 'G2' },
          { homeSlot: 'I1', awaySlot: 'J2' },
          { homeSlot: 'J1', awaySlot: 'I2' },
          { homeSlot: 'K1', awaySlot: 'L2' },
          { homeSlot: 'L1', awaySlot: 'K2' },
          { homeSlot: 'ADD-0', awaySlot: 'ADD-1' },
          { homeSlot: 'ADD-2', awaySlot: 'ADD-3' },
          { homeSlot: 'ADD-4', awaySlot: 'ADD-5' },
          { homeSlot: 'ADD-6', awaySlot: 'ADD-7' },
        ],
      },
    });

    assert.equal(output.roundOf32[0].homeTeamId, 'a-1');
    assert.equal(output.roundOf32[0].awayTeamId, 'b-2');
    assert.equal(output.roundOf32.length, ROUND_OF_32_MATCH_COUNT);
  });

  it('is deterministic for the same input and default mapping', () => {
    const input = makeFullBracketInput();
    const first = generateKnockoutBracket(input);
    const second = generateKnockoutBracket(input);

    assert.deepEqual(second.roundOf32, first.roundOf32);
    assert.deepEqual(DEFAULT_ROUND_OF_32_MAPPING.pairings.length, ROUND_OF_32_MATCH_COUNT);
  });

  it('rejects an incorrect number of teams', () => {
    assert.throws(
      () =>
        generateKnockoutBracket({
          groupQualifiers: makeGroupQualifiers(['A', 'B']),
          additionalTeamIds: ['add-0'],
        }),
      /Expected 32 teams/,
    );
  });

  it('rejects duplicate teams', () => {
    assert.throws(
      () =>
        generateKnockoutBracket({
          groupQualifiers: makeGroupQualifiers(TWELVE_GROUP_IDS).map((qualifier, index) =>
            index === 0
              ? { ...qualifier, secondPlaceTeamId: qualifier.firstPlaceTeamId }
              : qualifier,
          ),
          additionalTeamIds: Array.from({ length: 8 }, (_, index) => `add-${index}`),
        }),
      /teams must be unique/,
    );
  });
});
