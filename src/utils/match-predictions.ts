import type { PeriodScore, UserMatchPrediction } from '@/types/match';

export function isPeriodScorePrediction(
  prediction: UserMatchPrediction | undefined,
): prediction is PeriodScore {
  return (
    prediction !== undefined &&
    'home' in prediction &&
    'away' in prediction
  );
}

export function selectPeriodScorePredictions(
  userPredictions: Record<string, UserMatchPrediction>,
): Record<string, PeriodScore> {
  return Object.fromEntries(
    Object.entries(userPredictions).filter((entry): entry is [string, PeriodScore] =>
      isPeriodScorePrediction(entry[1]),
    ),
  );
}
