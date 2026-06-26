import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateKnockoutBracket } from '@/simulation/generate-knockout-bracket';
import { ROUND_OF_32_MATCH_COUNT } from '@/simulation/knockout-bracket-mapping';
import {
  KNOCKOUT_ROUND_ORDER,
  simulateKnockoutStage,
} from '@/simulation/simulate-knockout-stage';
import type { TeamRating } from '@/types/team';

function makeRating(
  teamId: string,
  overrides: Partial<Omit<TeamRating, 'teamId'>> = {},
): TeamRating {
  return {
    teamId,
    overall: 65,
    attack: 65,
    defence: 65,
    form: 65,
    tournamentExperience: 65,
    ...overrides,
  };
}

function makeGroupQualifiers(groupIds: string[]) {
  return groupIds.map((groupId) => ({
    groupId,
    firstPlaceTeamId: `${groupId.toLowerCase()}-1`,
    secondPlaceTeamId: `${groupId.toLowerCase()}-2`,
  }));
}

function makeKnockoutRatings(teamIds: string[]): Record<string, TeamRating> {
  return Object.fromEntries(
    teamIds.map((teamId, index) => [
      teamId,
      makeRating(
        teamId,
        index % 4 === 0
          ? { overall: 85, attack: 86, defence: 84, form: 85, tournamentExperience: 85 }
          : {},
      ),
    ]),
  );
}

function makeRoundOf32Input() {
  const groupIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const { roundOf32 } = generateKnockoutBracket({
    groupQualifiers: makeGroupQualifiers(groupIds),
    additionalTeamIds: Array.from({ length: 8 }, (_, index) => `add-${index}`),
  });
  const teamIds = roundOf32.flatMap((fixture) => [fixture.homeTeamId!, fixture.awayTeamId!]);

  return {
    roundOf32,
    ratings: makeKnockoutRatings(teamIds),
    seed: 'knockout-stage',
  };
}

function getRoundMatches(
  output: ReturnType<typeof simulateKnockoutStage>,
  round: (typeof KNOCKOUT_ROUND_ORDER)[number],
) {
  return output.rounds.find((roundResult) => roundResult.round === round)!.matches;
}

describe('simulateKnockoutStage', () => {
  it('simulates all knockout rounds from the Round of 32', () => {
    const output = simulateKnockoutStage(makeRoundOf32Input());

    assert.deepEqual(
      output.rounds.map((roundResult) => roundResult.round),
      KNOCKOUT_ROUND_ORDER,
    );
    assert.equal(getRoundMatches(output, 'round-of-32').length, 16);
    assert.equal(getRoundMatches(output, 'round-of-16').length, 8);
    assert.equal(getRoundMatches(output, 'quarter-final').length, 4);
    assert.equal(getRoundMatches(output, 'semi-final').length, 2);
    assert.equal(getRoundMatches(output, 'third-place').length, 1);
    assert.equal(getRoundMatches(output, 'final').length, 1);
  });

  it('simulates 32 knockout matches in total', () => {
    const output = simulateKnockoutStage(makeRoundOf32Input());
    const matchCount = output.rounds.reduce(
      (total, roundResult) => total + roundResult.matches.length,
      0,
    );

    assert.equal(matchCount, 32);
    assert.equal(ROUND_OF_32_MATCH_COUNT, 16);
  });

  it('returns a champion, runner-up and third place team', () => {
    const output = simulateKnockoutStage(makeRoundOf32Input());

    assert.equal(output.championId, output.final.winnerTeamId);
    assert.notEqual(output.championId, output.runnerUpId);
    assert.ok(output.thirdPlaceId);
    assert.notEqual(output.thirdPlaceId, output.championId);
    assert.notEqual(output.thirdPlaceId, output.runnerUpId);
  });

  it('sets the runner-up as the final loser', () => {
    const output = simulateKnockoutStage(makeRoundOf32Input());
    const finalLoser =
      output.final.winnerTeamId === output.final.homeTeamId
        ? output.final.awayTeamId
        : output.final.homeTeamId;

    assert.equal(output.runnerUpId, finalLoser);
  });

  it('produces deterministic output for the same seed', () => {
    const input = makeRoundOf32Input();
    const first = simulateKnockoutStage(input);
    const second = simulateKnockoutStage(input);

    assert.deepEqual(second.rounds, first.rounds);
    assert.deepEqual(second.final, first.final);
    assert.equal(second.championId, first.championId);
    assert.equal(second.runnerUpId, first.runnerUpId);
    assert.equal(second.thirdPlaceId, first.thirdPlaceId);
  });

  it('rejects an invalid Round of 32 fixture list', () => {
    const input = makeRoundOf32Input();

    assert.throws(
      () =>
        simulateKnockoutStage({
          ...input,
          roundOf32: input.roundOf32.slice(0, 8),
        }),
      /Expected 16 Round of 32 fixtures/,
    );
  });

  it('rejects missing ratings', () => {
    const input = makeRoundOf32Input();
    const { [input.roundOf32[0].homeTeamId!]: _removed, ...incompleteRatings } = input.ratings;

    assert.throws(
      () =>
        simulateKnockoutStage({
          ...input,
          ratings: incompleteRatings,
        }),
      /Missing rating for team/,
    );
  });
});
