import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { APP_MESSAGES } from '@/utils/app-messages';
import { getPredictionValidationError } from '@/utils/prediction-validation';

describe('getPredictionValidationError', () => {
  it('returns null for valid group scores', () => {
    assert.equal(
      getPredictionValidationError({
        homeGoals: 2,
        awayGoals: 1,
        isKnockoutMatch: false,
      }),
      null,
    );
  });

  it('flags invalid score input', () => {
    assert.equal(
      getPredictionValidationError({
        homeGoals: null,
        awayGoals: 1,
        isKnockoutMatch: false,
      }),
      APP_MESSAGES.invalidPredictionScore,
    );
  });

  it('allows knockout regulation draws', () => {
    assert.equal(
      getPredictionValidationError({
        homeGoals: 1,
        awayGoals: 1,
        isKnockoutMatch: true,
        knockoutPhase: 'regulation',
      }),
      null,
    );
  });

  it('flags unrealistic penalty predictions', () => {
    assert.equal(
      getPredictionValidationError({
        homeGoals: 5,
        awayGoals: 0,
        isKnockoutMatch: true,
        knockoutPhase: 'penalties',
      }),
      APP_MESSAGES.invalidPenaltyPrediction,
    );
  });
});
