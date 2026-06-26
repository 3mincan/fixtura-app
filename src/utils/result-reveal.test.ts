import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teams } from '@/data/teams';
import {
  canAdvanceReveal,
  formatMatchScore,
  getCurrentRevealMatch,
  getSimulatedGroupMatchesToReveal,
} from '@/utils/result-reveal';
import { getUserGroupMatches, matchInvolvesTeam } from '@/utils/user-matches';

describe('result reveal', () => {
  const mexPredictions = Object.fromEntries(
    getUserGroupMatches('mex', teams).map((match) => [match.id, { home: 2, away: 1 }]),
  );

  it('returns null when predictions are incomplete', () => {
    assert.equal(
      getSimulatedGroupMatchesToReveal({
        selectedTeamId: 'mex',
        teamList: teams,
        userPredictions: {
          'group-A-mex-kor': { home: 1, away: 0 },
        },
      }),
      null,
    );
  });

  it('returns only simulated non-user group matches when predictions are complete', () => {
    const matches = getSimulatedGroupMatchesToReveal({
      selectedTeamId: 'mex',
      teamList: teams,
      userPredictions: mexPredictions,
      seed: 'reveal-test',
    });

    assert.ok(matches);
    assert.equal(matches.length, 3);
    assert.ok(matches.every((match) => match.groupId === 'A'));
    assert.ok(matches.every((match) => !matchInvolvesTeam(match, 'mex')));
    assert.ok(matches.every((match) => match.result));
  });

  it('moves through reveal results one by one', () => {
    const matches = getSimulatedGroupMatchesToReveal({
      selectedTeamId: 'mex',
      teamList: teams,
      userPredictions: mexPredictions,
      seed: 'reveal-test',
    })!;

    let revealIndex = 0;

    assert.equal(getCurrentRevealMatch(matches, revealIndex)?.id, matches[0].id);
    assert.equal(canAdvanceReveal(matches, revealIndex), true);

    revealIndex += 1;
    assert.equal(getCurrentRevealMatch(matches, revealIndex)?.id, matches[1].id);
    assert.equal(canAdvanceReveal(matches, revealIndex), true);

    revealIndex += 1;
    assert.equal(getCurrentRevealMatch(matches, revealIndex)?.id, matches[2].id);
    assert.equal(canAdvanceReveal(matches, revealIndex), false);

    revealIndex += 1;
    assert.equal(getCurrentRevealMatch(matches, revealIndex), null);
  });

  it('formats match scores from regulation results', () => {
    assert.equal(
      formatMatchScore({
        id: 'group-A-mex-rsa',
        stage: 'group',
        homeTeamId: 'mex',
        awayTeamId: 'rsa',
        status: 'completed',
        groupId: 'A',
        result: { regulation: { home: 2, away: 1 } },
      }),
      '2 - 1',
    );
  });
});
