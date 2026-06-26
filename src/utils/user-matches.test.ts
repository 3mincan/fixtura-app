import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { getUserGroupMatchAwaitingPrediction } from '@/utils/matchday-clock';
import { getNextUserMatch, getUserGroupMatches } from '@/utils/user-matches';

describe('user matches', () => {
  it('returns only group matches involving the selected team', () => {
    const userMatches = getUserGroupMatches('mex', teams);

    assert.equal(userMatches.length, 3);
    assert.ok(userMatches.every((match) => match.groupId === 'A'));
    assert.ok(
      userMatches.every(
        (match) => match.homeTeamId === 'mex' || match.awayTeamId === 'mex',
      ),
    );
  });

  it('returns the first unpredicted user match that has not already been played', () => {
    const nextMatch = getNextUserMatch('mex', teams);

    assert.equal(nextMatch?.id, 'group-A-mex-kor');
  });

  it('finds the user match awaiting prediction one hour before kickoff', () => {
    const turMatch = getUserGroupMatches('tur', teams)[1]!;
    const oneHourBefore = new Date(`${turMatch.scheduledDate}T19:00:00`);

    assert.equal(
      getUserGroupMatchAwaitingPrediction('tur', teams, oneHourBefore, {})?.id,
      'group-D-tur-par',
    );
  });

  it('finds the user match awaiting prediction once kickoff is reached', () => {
    const turMatch = getUserGroupMatches('tur', teams)[1]!;
    const kickoff = new Date(`${turMatch.scheduledDate}T20:00:00`);

    assert.equal(
      getUserGroupMatchAwaitingPrediction('tur', teams, kickoff, {})?.id,
      'group-D-tur-par',
    );
    assert.equal(
      getUserGroupMatchAwaitingPrediction('tur', teams, kickoff, {
        'group-D-tur-par': { home: 1, away: 0 },
      }),
      null,
    );
  });

  it('skips completed user matches when finding the next match', () => {
    const nextMatch = getNextUserMatch('mex', teams, [
      {
        id: 'group-A-mex-rsa',
        stage: 'group',
        homeTeamId: 'mex',
        awayTeamId: 'rsa',
        status: 'completed',
        groupId: 'A',
        result: {
          regulation: { home: 2, away: 1 },
        },
      },
    ]);

    assert.equal(nextMatch?.id, 'group-A-mex-kor');
  });

  it('returns null when all user group matches are completed', () => {
    const userMatches = getUserGroupMatches('mex', teams);
    const completedMatches = userMatches.map((match) => ({
      ...match,
      status: 'completed' as const,
      result: {
        regulation: { home: 1, away: 0 },
      },
    }));

    assert.equal(getNextUserMatch('mex', teams, completedMatches), null);
  });
});
