import { APP_MESSAGES } from '@/utils/app-messages';
import type { KnockoutPredictionPhase } from '@/utils/knockout-prediction';
import { isValidPenaltyPrediction } from '@/utils/knockout-prediction';

type PredictionValidationInput = {
  homeGoals: number | null;
  awayGoals: number | null;
  isKnockoutMatch?: boolean;
  knockoutPhase?: KnockoutPredictionPhase;
};

export function getPredictionValidationError({
  homeGoals,
  awayGoals,
  isKnockoutMatch = false,
  knockoutPhase,
}: PredictionValidationInput): string | null {
  if (homeGoals === null || awayGoals === null) {
    return APP_MESSAGES.invalidPredictionScore;
  }

  if (isKnockoutMatch && knockoutPhase === 'penalties') {
    if (!isValidPenaltyPrediction(homeGoals, awayGoals)) {
      return APP_MESSAGES.invalidPenaltyPrediction;
    }
  }

  return null;
}
