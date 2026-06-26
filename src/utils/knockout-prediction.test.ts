import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getKnockoutWinnerTeamId,
  isValidPenaltyPrediction,
} from '@/utils/knockout-prediction';

describe('knockout prediction helpers', () => {
  it('resolves regulation winners', () => {
    assert.equal(
      getKnockoutWinnerTeamId('mex', 'rsa', {
        regulation: { home: 2, away: 1 },
      }),
      'mex',
    );
  });

  it('resolves extra-time winners', () => {
    assert.equal(
      getKnockoutWinnerTeamId('mex', 'rsa', {
        regulation: { home: 1, away: 1 },
        extraTime: { home: 1, away: 0 },
      }),
      'mex',
    );
  });

  it('resolves penalty winners', () => {
    assert.equal(
      getKnockoutWinnerTeamId('mex', 'rsa', {
        regulation: { home: 0, away: 0 },
        extraTime: { home: 0, away: 0 },
        penalties: { home: 4, away: 3 },
      }),
      'mex',
    );
  });

  it('accepts realistic penalty predictions', () => {
    assert.equal(isValidPenaltyPrediction(3, 0), true);
    assert.equal(isValidPenaltyPrediction(4, 3), true);
    assert.equal(isValidPenaltyPrediction(3, 2), true);
  });

  it('rejects tied or unrealistic penalty predictions', () => {
    assert.equal(isValidPenaltyPrediction(4, 4), false);
    assert.equal(isValidPenaltyPrediction(5, 0), false);
    assert.equal(isValidPenaltyPrediction(4, 0), false);
    assert.equal(isValidPenaltyPrediction(6, 3), false);
  });
});
