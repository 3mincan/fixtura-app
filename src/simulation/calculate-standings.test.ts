import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateStandings } from '@/simulation/calculate-standings';
import type { Match, MatchResult } from '@/types/match';

function makeResult(homeGoals: number, awayGoals: number): MatchResult {
  return {
    regulation: {
      home: homeGoals,
      away: awayGoals,
    },
  };
}

function makeCompletedMatch(
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
): Match {
  return {
    id: `match-${homeTeamId}-${awayTeamId}`,
    stage: 'group',
    homeTeamId,
    awayTeamId,
    status: 'completed',
    groupId: 'A',
    result: makeResult(homeGoals, awayGoals),
  };
}

describe('calculateStandings', () => {
  it('awards wins, draws and losses with correct points', () => {
    const standings = calculateStandings({
      teamIds: ['a', 'b', 'c'],
      matches: [
        makeCompletedMatch('a', 'b', 2, 0),
        makeCompletedMatch('b', 'c', 1, 1),
      ],
    });

    const teamA = standings.find((standing) => standing.teamId === 'a')!;
    const teamB = standings.find((standing) => standing.teamId === 'b')!;
    const teamC = standings.find((standing) => standing.teamId === 'c')!;

    assert.equal(teamA.won, 1);
    assert.equal(teamA.drawn, 0);
    assert.equal(teamA.lost, 0);
    assert.equal(teamA.points, 3);

    assert.equal(teamB.drawn, 1);
    assert.equal(teamB.lost, 1);
    assert.equal(teamB.points, 1);

    assert.equal(teamC.drawn, 1);
    assert.equal(teamC.points, 1);
  });

  it('sorts teams by points first', () => {
    const standings = calculateStandings({
      teamIds: ['a', 'b', 'c'],
      matches: [
        makeCompletedMatch('a', 'b', 1, 0),
        makeCompletedMatch('a', 'c', 2, 1),
        makeCompletedMatch('b', 'c', 1, 1),
      ],
    });

    assert.equal(standings[0].teamId, 'a');
    assert.equal(standings[0].points, 6);
    assert.equal(standings[1].points, 1);
    assert.equal(standings[2].points, 1);
    assert.ok(standings[0].points > standings[1].points);
  });

  it('uses goal difference as the next tiebreaker', () => {
    const standings = calculateStandings({
      teamIds: ['a', 'b', 'c'],
      matches: [
        makeCompletedMatch('a', 'c', 3, 0),
        makeCompletedMatch('b', 'c', 2, 0),
        makeCompletedMatch('a', 'b', 0, 0),
      ],
    });

    const teamA = standings.find((standing) => standing.teamId === 'a')!;
    const teamB = standings.find((standing) => standing.teamId === 'b')!;

    assert.equal(teamA.points, 4);
    assert.equal(teamB.points, 4);
    assert.ok(teamA.goalDifference > teamB.goalDifference);
    assert.equal(standings[0].teamId, 'a');
    assert.equal(standings[1].teamId, 'b');
  });

  it('uses goals scored when points and goal difference are tied', () => {
    const standings = calculateStandings({
      teamIds: ['a', 'b', 'c'],
      matches: [
        makeCompletedMatch('a', 'b', 0, 0),
        makeCompletedMatch('a', 'c', 3, 1),
        makeCompletedMatch('b', 'c', 2, 0),
      ],
    });

    const teamA = standings.find((standing) => standing.teamId === 'a')!;
    const teamB = standings.find((standing) => standing.teamId === 'b')!;

    assert.equal(teamA.points, 4);
    assert.equal(teamB.points, 4);
    assert.equal(teamA.goalDifference, teamB.goalDifference);
    assert.ok(teamA.goalsFor > teamB.goalsFor);
    assert.equal(standings[0].teamId, 'a');
    assert.equal(standings[1].teamId, 'b');
  });

  it('uses head-to-head before the deterministic fallback', () => {
    const standings = calculateStandings({
      teamIds: ['a', 'b', 'c', 'd'],
      matches: [
        makeCompletedMatch('a', 'b', 2, 1),
        makeCompletedMatch('a', 'c', 1, 1),
        makeCompletedMatch('a', 'd', 1, 2),
        makeCompletedMatch('b', 'c', 1, 1),
        makeCompletedMatch('b', 'd', 2, 1),
        makeCompletedMatch('c', 'd', 0, 0),
      ],
    });

    const teamA = standings.find((standing) => standing.teamId === 'a')!;
    const teamB = standings.find((standing) => standing.teamId === 'b')!;

    assert.equal(teamA.points, 4);
    assert.equal(teamB.points, 4);
    assert.equal(teamA.goalDifference, 0);
    assert.equal(teamB.goalDifference, 0);
    assert.equal(teamA.goalsFor, 4);
    assert.equal(teamB.goalsFor, 4);
    assert.equal(standings[0].teamId, 'a');
    assert.equal(standings[1].teamId, 'b');
  });

  it('uses team id as a deterministic fallback when teams are still tied', () => {
    const standings = calculateStandings({
      teamIds: ['b', 'a'],
      matches: [makeCompletedMatch('a', 'b', 1, 1)],
    });

    assert.equal(standings[0].teamId, 'a');
    assert.equal(standings[1].teamId, 'b');
    assert.equal(standings[0].points, 1);
    assert.equal(standings[1].points, 1);
  });
});
