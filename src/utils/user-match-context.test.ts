import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { translate } from '@/i18n/translations';
import type { Match } from '@/types/match';
import {
  formatUserMatchStageLabel,
  getOpponentPathSummary,
} from '@/utils/user-match-context';

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
  translate('en', key, params);

describe('user match context', () => {
  it('formats group and knockout stage labels', () => {
    assert.equal(
      formatUserMatchStageLabel(
        {
          id: 'group-A-mex-rsa',
          stage: 'group',
          homeTeamId: 'mex',
          awayTeamId: 'rsa',
          status: 'scheduled',
          round: 'Matchday 1',
        },
        t,
      ),
      'Matchday 1',
    );
    assert.equal(
      formatUserMatchStageLabel(
        {
          id: 'r32-1',
          stage: 'round-of-32',
          homeTeamId: 'mex',
          awayTeamId: 'can',
          status: 'scheduled',
        },
        t,
      ),
      'Round of 32',
    );
  });

  it('summarizes round of 32 opponents from group standings', () => {
    const standings = {
      B: [
        { teamId: 'qat', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 2, goalDifference: 3, points: 7 },
        { teamId: 'can', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1, points: 6 },
        { teamId: 'sui', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 3 },
        { teamId: 'bih', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3, points: 1 },
      ],
    };

    const summary = getOpponentPathSummary({
      match: {
        id: 'r32-1',
        stage: 'round-of-32',
        homeTeamId: 'mex',
        awayTeamId: 'can',
        status: 'scheduled',
      },
      userTeamId: 'mex',
      teamList: teams,
      groupStandings: standings,
      knockoutRoundResults: [],
      t,
      language: 'en',
    });

    assert.match(summary ?? '', /Canada finished 2nd in Group B with/);
    assert.match(summary ?? '', /Bosnia & Herzegovina/);
    assert.match(summary ?? '', /Qatar/);
    assert.match(summary ?? '', /Switzerland/);
  });

  it('summarizes later knockout rounds from the previous win', () => {
    const summary = getOpponentPathSummary({
      match: {
        id: 'round-of-16-1',
        stage: 'round-of-16',
        homeTeamId: 'mex',
        awayTeamId: 'can',
        status: 'scheduled',
      },
      userTeamId: 'mex',
      teamList: teams,
      groupStandings: {},
      knockoutRoundResults: [
        {
          round: 'round-of-32',
          matches: [
            {
              id: 'r32-1',
              round: 'round-of-32',
              slot: 1,
              homeTeamId: 'can',
              awayTeamId: 'par',
              result: { regulation: { home: 2, away: 1 } },
              winnerTeamId: 'can',
            },
          ],
        },
      ],
      t,
      language: 'en',
    });

    assert.equal(
      summary,
      'Canada beat Paraguay in the Round of 32 (2 - 1).',
    );
  });
});
