import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { useTournamentStore } from '@/store/tournament-store';
import {
  canAdvanceReveal,
  getCurrentRevealMatch,
} from '@/utils/result-reveal';
import { matchInvolvesTeam } from '@/utils/user-matches';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('result reveal flow', () => {
  afterEach(() => {
    resetStore();
  });

  it('prepares simulated matches and lets the user move through results', () => {
    useTournamentStore.getState().selectTeam('mex');

    for (const matchId of ['group-A-mex-kor', 'group-A-cze-mex']) {
      const pendingMatch = useTournamentStore.getState().pendingUserMatch!;
      assert.equal(pendingMatch.id, matchId);
      useTournamentStore.getState().saveUserPrediction(pendingMatch, 1, 0);
    }

    useTournamentStore.getState().prepareSimulatedReveal();

    let state = useTournamentStore.getState();

    assert.equal(state.simulatedRevealMatches.length, 23);
    assert.ok(
      state.simulatedRevealMatches.every((match) => !matchInvolvesTeam(match, 'mex')),
    );
    assert.equal(state.simulatedRevealIndex, 0);
    assert.equal(
      getCurrentRevealMatch(state.simulatedRevealMatches, state.simulatedRevealIndex)?.id,
      state.simulatedRevealMatches[0]?.id,
    );
    assert.equal(
      canAdvanceReveal(state.simulatedRevealMatches, state.simulatedRevealIndex),
      true,
    );

    useTournamentStore.getState().revealNextResult();
    state = useTournamentStore.getState();
    assert.equal(state.simulatedRevealIndex, 1);
  });
});
