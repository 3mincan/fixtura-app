import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { groups } from '@/data/groups';
import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { simulateTournament } from '@/simulation/simulate-tournament';
import {
  buildKnockoutBracketView,
  formatKnockoutMatchScore,
  getKnockoutBracketView,
} from '@/utils/knockout-bracket-view';
import { getUserGroupMatches } from '@/utils/user-matches';

describe('knockout bracket view', () => {
  const mexPredictions = Object.fromEntries(
    getUserGroupMatches('mex', teams).map((match) => [match.id, { home: 2, away: 1 }]),
  );

  it('returns null when predictions are incomplete', () => {
    assert.equal(
      getKnockoutBracketView({
        selectedTeamId: 'mex',
        teamList: teams,
        userPredictions: {
          'group-A-mex-rsa': { home: 1, away: 0 },
        },
      }),
      null,
    );
  });

  it('formats regulation, extra time and penalty scores', () => {
    assert.equal(
      formatKnockoutMatchScore({
        regulation: { home: 1, away: 1 },
      }),
      '1 - 1',
    );
    assert.equal(
      formatKnockoutMatchScore({
        regulation: { home: 1, away: 1 },
        extraTime: { home: 1, away: 0 },
      }),
      '2 - 1 (aet)',
    );
    assert.equal(
      formatKnockoutMatchScore({
        regulation: { home: 0, away: 0 },
        extraTime: { home: 0, away: 0 },
        penalties: { home: 4, away: 3 },
      }),
      '0 - 0 (4-3 pens)',
    );
  });

  it('builds a vertical bracket view with rounds, teams, scores and winners', () => {
    const tournament = simulateTournament({
      teams,
      groups,
      ratings: teamRatingsById,
      seed: 'knockout-bracket-test',
      userTeamId: 'mex',
      userPredictions: mexPredictions,
    });
    const view = buildKnockoutBracketView(tournament.knockoutStage);

    assert.equal(view.rounds.length, 6);
    assert.equal(view.championId, tournament.championId);
    assert.ok(view.championId);

    const totalMatches = view.rounds.reduce((sum, round) => sum + round.matches.length, 0);

    assert.equal(totalMatches, 32);

    for (const round of view.rounds) {
      assert.ok(round.roundName.length > 0);

      for (const match of round.matches) {
        assert.ok(match.homeTeamId);
        assert.ok(match.awayTeamId);
        assert.ok(match.score);
        assert.ok(match.winnerTeamId);
        assert.ok([match.homeTeamId, match.awayTeamId].includes(match.winnerTeamId));
      }
    }

    const finalRound = view.rounds.find((round) => round.round === 'final');

    assert.ok(finalRound);
    assert.equal(finalRound.matches[0]?.winnerTeamId, view.championId);
  });

  it('matches the simulated tournament knockout stage', () => {
    const view = getKnockoutBracketView({
      selectedTeamId: 'mex',
      teamList: teams,
      userPredictions: mexPredictions,
      seed: 'knockout-bracket-test',
    });
    const tournament = simulateTournament({
      teams,
      groups,
      ratings: teamRatingsById,
      seed: 'knockout-bracket-test',
      userTeamId: 'mex',
      userPredictions: mexPredictions,
    });
    const expected = buildKnockoutBracketView(tournament.knockoutStage);

    assert.deepEqual(view, expected);
  });
});
