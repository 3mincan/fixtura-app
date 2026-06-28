import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { teamRatingsById } from '@/data/team-ratings';
import { worldCupGroupFixtures } from '@/data/worldcup-fixtures';
import {
  advanceThroughMatchdays,
  getDefaultMatchdaySimulationSeed,
  isGroupStageComplete,
  playMatchday,
  previewMatchdayResults,
  simulateFixture,
} from '@/simulation/play-matchday';
import { getUserGroupMatches } from '@/utils/user-matches';

describe('playMatchday', () => {
  it('previews user matches in random mode without manual predictions', () => {
    const preview = previewMatchdayResults({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      userPredictions: {},
      completedMatches: [],
      seed: 'matchday-progress:Matchday 1',
      autoSimulateUserMatches: true,
    });

    assert.equal(preview.length, 2);
    assert.ok(preview.some((match) => match.id === 'group-A-mex-rsa'));
    assert.ok(preview.every((match) => match.result?.regulation));
  });

  it('previews random-mode user matches even when instant mode requires AI scores', () => {
    const preview = previewMatchdayResults({
      matchday: 'Matchday 8',
      userTeamId: 'mex',
      userPredictions: {},
      completedMatches: [],
      seed: 'matchday-progress:Matchday 8',
      aiScores: {},
      requireAiScores: true,
      autoSimulateUserMatches: true,
    });

    const userMatch = preview.find((match) => match.id === 'group-A-mex-kor');

    assert.ok(userMatch);
    assert.ok(userMatch.result?.regulation);
  });

  it('uses the default matchday seed for random-mode user match previews', () => {
    const preview = previewMatchdayResults({
      matchday: 'Matchday 8',
      userTeamId: 'mex',
      userPredictions: {},
      completedMatches: [],
      seed: 'matchday-progress:Matchday 8',
      autoSimulateUserMatches: true,
    });
    const fixture = worldCupGroupFixtures.find((match) => match.id === 'group-A-mex-kor');
    const previewedMatch = preview.find((match) => match.id === 'group-A-mex-kor');

    assert.ok(fixture);
    assert.ok(previewedMatch);
    assert.deepEqual(
      previewedMatch.result?.regulation,
      simulateFixture(
        fixture,
        teamRatingsById,
        getDefaultMatchdaySimulationSeed('Matchday 8'),
      ).result?.regulation,
    );
  });

  it('plays user matches in random mode without manual predictions', () => {
    const result = playMatchday({
      matchday: 'Matchday 1',
      completedMatches: [],
      userTeamId: 'mex',
      userPredictions: {},
      seed: 'matchday-progress:Matchday 1',
      autoSimulateUserMatches: true,
    });

    assert.equal(result.playedMatchIds.length, 2);
    assert.ok(result.playedMatchIds.includes('group-A-mex-rsa'));
    assert.ok(
      result.completedMatches.every((match) => match.result?.regulation),
    );
  });

  it('previews matchday 1 results before the user submits a prediction', () => {
    const preview = previewMatchdayResults({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      userPredictions: {},
      completedMatches: [],
      seed: 'matchday-progress:Matchday 1',
    });

    assert.equal(preview.length, 2);
    assert.deepEqual(
      preview.map((match) => match.id).sort(),
      ['group-A-kor-cze', 'group-A-mex-rsa'],
    );
    assert.deepEqual(
      preview.find((match) => match.id === 'group-A-kor-cze')?.result?.regulation,
      { home: 2, away: 1 },
    );
    assert.deepEqual(
      preview.find((match) => match.id === 'group-A-mex-rsa')?.result?.regulation,
      { home: 2, away: 0 },
    );
  });

  it('uses official results for already-played user matches without predictions', () => {
    const preview = previewMatchdayResults({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      userPredictions: {},
      completedMatches: [],
      seed: 'matchday-progress:Matchday 1',
      autoSimulateUserMatches: true,
    });
    const mexMatch = preview.find((match) => match.id === 'group-A-mex-rsa');

    assert.ok(mexMatch);
    assert.deepEqual(mexMatch?.result?.regulation, { home: 2, away: 0 });
  });

  it('matches preview scores with the eventual matchday simulation', () => {
    const userMatch = getUserGroupMatches('mex', teams)[0]!;
    const preview = previewMatchdayResults({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      userPredictions: {},
      completedMatches: [],
      seed: 'matchday-progress:Matchday 1',
    });
    const played = playMatchday({
      matchday: 'Matchday 1',
      completedMatches: [],
      userTeamId: 'mex',
      userPredictions: {
        [userMatch.id]: { home: 2, away: 1 },
      },
      seed: 'matchday-progress:Matchday 1',
    });
    const previewedKorCze = preview.find((match) => match.id === 'group-A-kor-cze');
    const playedKorCze = played.completedMatches.find((match) => match.id === 'group-A-kor-cze');

    assert.deepEqual(
      previewedKorCze?.result?.regulation,
      playedKorCze?.result?.regulation,
    );
  });

  it('plays every match on matchday 1 when the user predicts their opening match', () => {
    const userMatch = getUserGroupMatches('mex', teams)[0]!;

    const result = playMatchday({
      matchday: 'Matchday 1',
      completedMatches: [],
      userTeamId: 'mex',
      userPredictions: {
        [userMatch.id]: { home: 2, away: 1 },
      },
      seed: 'matchday-1',
    });

    assert.equal(result.playedMatchIds.length, 2);
    assert.deepEqual(result.playedMatchIds, ['group-A-mex-rsa', 'group-A-kor-cze']);
    assert.equal(result.groupStandings.A.length, 4);
    assert.ok(result.groupStandings.A.some((standing) => standing.teamId === 'mex'));
  });

  it('auto-plays intervening matchdays until the next user matchday', () => {
    const userMatches = getUserGroupMatches('mex', teams);
    const firstMatch = userMatches[0]!;

    const progress = advanceThroughMatchdays({
      fromMatchday: 'Matchday 1',
      completedMatches: [],
      userTeamId: 'mex',
      userPredictions: {
        [firstMatch.id]: { home: 2, away: 0 },
      },
      userMatchIds: userMatches.map((match) => match.id),
      seed: 'progress-1',
    });

    assert.equal(progress.lastPlayedMatchday, 'Matchday 7');
    assert.ok(progress.groupStandings.B.length > 0);
    assert.ok(progress.groupStandings.L.length > 0);

    const nextUserMatch = getUserGroupMatches('mex', teams).find(
      (match) => !progress.completedMatches.some((completed) => completed.id === match.id),
    );

    assert.equal(nextUserMatch?.id, 'group-A-mex-kor');
    assert.equal(nextUserMatch?.round, 'Matchday 8');
  });

  it('completes the full group stage after the final user matchday', () => {
    const userMatches = getUserGroupMatches('mex', teams);
    const predictions = Object.fromEntries(
      userMatches.map((match) => [match.id, { home: 3, away: 0 }]),
    );

    let completedMatches: typeof userMatches = [];

    for (const userMatch of userMatches) {
      const progress = advanceThroughMatchdays({
        fromMatchday: userMatch.round!,
        completedMatches,
        userTeamId: 'mex',
        userPredictions: predictions,
        userMatchIds: userMatches.map((match) => match.id),
        seed: `full-group-${userMatch.id}`,
      });

      completedMatches = progress.completedMatches;
    }

    assert.equal(completedMatches.length, 72);
    assert.equal(isGroupStageComplete(completedMatches), true);
  });

  it('completes the full group stage in random mode without manual predictions', () => {
    const progress = advanceThroughMatchdays({
      fromMatchday: 'Matchday 1',
      completedMatches: [],
      userTeamId: 'mex',
      userPredictions: {},
      userMatchIds: [],
      autoSimulateUserMatches: true,
    });

    assert.equal(progress.completedMatches.length, 72);
    assert.equal(isGroupStageComplete(progress.completedMatches), true);
    assert.equal(progress.groupStandings.A.length, 4);
  });
});
