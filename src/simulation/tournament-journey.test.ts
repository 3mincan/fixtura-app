import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { completeGroupStageForUser } from '@/simulation/complete-group-stage';
import {
  advanceKnockoutJourney,
  hasAllUserGroupPredictions,
  knockoutFixtureToMatch,
  startKnockoutJourney,
} from '@/simulation/tournament-journey';
import { useTournamentStore } from '@/store/tournament-store';
import { getUserGroupMatches } from '@/utils/user-matches';

const JOURNEY_SEED = 'journey-test';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

function makeGroupPredictions(teamId: string, homeGoals: number, awayGoals: number) {
  return Object.fromEntries(
    getUserGroupMatches(teamId, teams).map((match) => [
      match.id,
      { home: homeGoals, away: awayGoals },
    ]),
  );
}

function completeGroupStage(teamId: string, homeGoals: number, awayGoals: number) {
  const userPredictions = makeGroupPredictions(teamId, homeGoals, awayGoals);
  const progress = completeGroupStageForUser({
    userTeamId: teamId,
    userPredictions,
    seed: `${JOURNEY_SEED}:group`,
  });

  return {
    userPredictions,
    completedMatches: progress.completedMatches,
    groupStandings: progress.groupStandings,
  };
}

function startJourneyAfterGroupStage(
  teamId: string,
  homeGoals: number,
  awayGoals: number,
) {
  const { userPredictions, completedMatches, groupStandings } = completeGroupStage(
    teamId,
    homeGoals,
    awayGoals,
  );

  return startKnockoutJourney({
    selectedTeamId: teamId,
    teamList: teams,
    userPredictions,
    ratings: teamRatingsById,
    seed: JOURNEY_SEED,
    completedMatches,
    groupStandings,
  });
}

function predictWinningKnockoutRound(
  journey: ReturnType<typeof startKnockoutJourney>,
  selectedTeamId: string,
  userPredictions: Record<string, import('@/types/match').UserMatchPrediction>,
) {
  const fixture = journey.pendingKnockoutFixture!;

  const prediction = {
    regulation:
      fixture.homeTeamId === selectedTeamId
        ? { home: 2, away: 0 }
        : { home: 0, away: 2 },
  };

  userPredictions[fixture.id] = prediction;

  return advanceKnockoutJourney({
    selectedTeamId,
    teamList: teams,
    userPredictions,
    ratings: teamRatingsById,
    seed: JOURNEY_SEED,
    roundOf32Fixtures: journey.roundOf32Fixtures,
    knockoutRoundResults: journey.knockoutRoundResults,
    pendingKnockoutFixture: fixture,
  });
}

describe('tournament journey', () => {
  afterEach(() => {
    resetStore();
  });

  it('starts knockout predictions when the selected team qualifies', () => {
    const journey = startJourneyAfterGroupStage('mex', 3, 0);

    assert.equal(journey.phase, 'knockout');
    assert.equal(journey.userQualified, true);
    assert.equal(journey.currentStage, 'round-of-32');
    assert.ok(journey.pendingKnockoutFixture);
    assert.ok(
      [journey.pendingKnockoutFixture.homeTeamId, journey.pendingKnockoutFixture.awayTeamId].includes(
        'mex',
      ),
    );
  });

  it('lets the selected team win the tournament by predicting knockout wins', () => {
    const selectedTeamId = 'mex';
    const { userPredictions } = completeGroupStage(selectedTeamId, 3, 0);

    let journey = startJourneyAfterGroupStage(selectedTeamId, 3, 0);

    assert.equal(journey.phase, 'knockout');

    while (journey.phase === 'knockout') {
      journey = predictWinningKnockoutRound(journey, selectedTeamId, userPredictions);
    }

    assert.equal(journey.phase, 'champion');
    assert.equal(journey.championId, selectedTeamId);
    assert.equal(journey.pendingKnockoutFixture, null);
    assert.ok(journey.knockoutRoundResults.some((round) => round.round === 'final'));
  });

  it('simulates the remaining tournament and shows the champion when the user is eliminated', () => {
    const selectedTeamId = 'mex';
    const { userPredictions } = completeGroupStage(selectedTeamId, 3, 0);

    let journey = startJourneyAfterGroupStage(selectedTeamId, 3, 0);

    const fixture = journey.pendingKnockoutFixture!;
    userPredictions[fixture.id] = {
      regulation:
        fixture.homeTeamId === selectedTeamId
          ? { home: 0, away: 2 }
          : { home: 2, away: 0 },
    };

    journey = advanceKnockoutJourney({
      selectedTeamId,
      teamList: teams,
      userPredictions,
      ratings: teamRatingsById,
      seed: JOURNEY_SEED,
      roundOf32Fixtures: journey.roundOf32Fixtures,
      knockoutRoundResults: journey.knockoutRoundResults,
      pendingKnockoutFixture: fixture,
    });

    assert.equal(journey.phase, 'eliminated');
    assert.notEqual(journey.championId, selectedTeamId);
    assert.ok(journey.championId);
    assert.equal(journey.pendingKnockoutFixture, null);
    assert.ok(journey.knockoutRoundResults.some((round) => round.round === 'final'));
    assert.equal(
      journey.knockoutRoundResults.find((round) => round.round === 'final')?.matches[0]?.winnerTeamId,
      journey.championId,
    );
  });

  it('simulates the remaining tournament when the user loses the final', () => {
    const selectedTeamId = 'mex';
    const { userPredictions } = completeGroupStage(selectedTeamId, 3, 0);

    let journey = startJourneyAfterGroupStage(selectedTeamId, 3, 0);

    while (journey.phase === 'knockout' && journey.pendingKnockoutFixture?.round !== 'final') {
      journey = predictWinningKnockoutRound(journey, selectedTeamId, userPredictions);
    }

    assert.equal(journey.pendingKnockoutFixture?.round, 'final');

    const finalFixture = journey.pendingKnockoutFixture!;
    userPredictions[finalFixture.id] = {
      regulation:
        finalFixture.homeTeamId === selectedTeamId
          ? { home: 0, away: 2 }
          : { home: 2, away: 0 },
    };

    journey = advanceKnockoutJourney({
      selectedTeamId,
      teamList: teams,
      userPredictions,
      ratings: teamRatingsById,
      seed: JOURNEY_SEED,
      roundOf32Fixtures: journey.roundOf32Fixtures,
      knockoutRoundResults: journey.knockoutRoundResults,
      pendingKnockoutFixture: finalFixture,
    });

    assert.equal(journey.phase, 'eliminated');
    assert.notEqual(journey.championId, selectedTeamId);
    assert.ok(journey.championId);
    assert.ok(journey.knockoutRoundResults.some((round) => round.round === 'final'));
  });

  it('schedules the third-place match and final after the semi-final', () => {
    const selectedTeamId = 'mex';
    const { userPredictions } = completeGroupStage(selectedTeamId, 3, 0);

    let journey = startJourneyAfterGroupStage(selectedTeamId, 3, 0);

    while (journey.phase === 'knockout' && journey.pendingKnockoutFixture?.round !== 'semi-final') {
      journey = predictWinningKnockoutRound(journey, selectedTeamId, userPredictions);
    }

    assert.equal(journey.pendingKnockoutFixture?.round, 'semi-final');

    journey = predictWinningKnockoutRound(journey, selectedTeamId, userPredictions);

    const thirdPlaceRound = journey.knockoutRoundResults.find(
      (round) => round.round === 'third-place',
    );

    assert.equal(journey.pendingKnockoutFixture?.round, 'final');
    assert.equal(journey.pendingKnockoutFixture.scheduledDate, '2026-07-19');
    assert.equal(knockoutFixtureToMatch(journey.pendingKnockoutFixture).scheduledDate, '2026-07-19');
    assert.equal(thirdPlaceRound?.matches[0]?.round, 'third-place');
  });

  it('advances the store through knockout predictions until elimination', () => {
    useTournamentStore.getState().selectTeam('mex');

    for (const match of getUserGroupMatches('mex', teams)) {
      useTournamentStore.getState().saveUserPrediction(match, 3, 0);
    }

    let state = useTournamentStore.getState();

    assert.equal(state.tournamentPhase, 'group');

    useTournamentStore.getState().beginKnockoutStage();

    state = useTournamentStore.getState();

    assert.equal(state.tournamentPhase, 'knockout');
    assert.ok(state.pendingUserMatch);
    assert.equal(state.pendingUserMatch.stage, 'round-of-32');

    const fixture = knockoutFixtureToMatch(state.pendingKnockoutFixture!);

    useTournamentStore.getState().saveKnockoutPrediction(fixture, {
      regulation:
        fixture.homeTeamId === 'mex' ? { home: 0, away: 2 } : { home: 2, away: 0 },
    });

    state = useTournamentStore.getState();

    assert.equal(state.tournamentPhase, 'eliminated');
    assert.equal(state.championId, state.knockoutRoundResults.at(-1)?.matches[0]?.winnerTeamId);
    assert.equal(state.pendingUserMatch, null);
  });

  it('advances the store through knockout predictions until the user wins', () => {
    useTournamentStore.getState().selectTeam('mex');

    for (const match of getUserGroupMatches('mex', teams)) {
      useTournamentStore.getState().saveUserPrediction(match, 3, 0);
    }

    let state = useTournamentStore.getState();

    useTournamentStore.getState().beginKnockoutStage();

    state = useTournamentStore.getState();

    while (state.tournamentPhase === 'knockout') {
      const match = state.pendingUserMatch!;

      useTournamentStore.getState().saveKnockoutPrediction(match, {
        regulation:
          match.homeTeamId === 'mex' ? { home: 2, away: 0 } : { home: 0, away: 2 },
      });

      state = useTournamentStore.getState();
    }

    assert.equal(state.tournamentPhase, 'champion');
    assert.equal(state.championId, 'mex');
    assert.equal(state.pendingUserMatch, null);
  });
});

describe('hasAllUserGroupPredictions', () => {
  it('detects when all group predictions are complete', () => {
    const predictions = makeGroupPredictions('mex', 1, 0);

    assert.equal(hasAllUserGroupPredictions('mex', teams, predictions), true);
    assert.equal(hasAllUserGroupPredictions('mex', teams, {}), false);
  });

  it('treats already-played official results as satisfied predictions', () => {
    assert.equal(
      hasAllUserGroupPredictions('mex', teams, {
        'group-A-mex-kor': { home: 1, away: 0 },
        'group-A-cze-mex': { home: 2, away: 0 },
      }),
      true,
    );
  });
});
