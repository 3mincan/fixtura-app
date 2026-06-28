import { useEffect, useMemo } from 'react';

import { resolveMatchScores } from '@/simulation/ai';
import { useAppStore } from '@/store/app-store';
import { useAiMatchScoresStore } from '@/store/ai-match-scores-store';
import type { AppLanguage } from '@/types/app-settings';
import type { Match } from '@/types/match';
import type { Standing } from '@/types/standing';
import { matchInvolvesTeam } from '@/utils/user-matches';

type UseAiMatchScoresInput = {
  fixtures: Match[];
  userTeamId: string | null;
  completedMatches: Match[];
  groupStandings: Record<string, Standing[]>;
  language: AppLanguage;
  enabled?: boolean;
  useGemini?: boolean;
};

export function useAiMatchScores({
  fixtures,
  userTeamId,
  completedMatches,
  groupStandings,
  language,
  enabled = true,
  useGemini = true,
}: UseAiMatchScoresInput) {
  const scores = useAiMatchScoresStore((state) => state.scores);

  const fixtureIdsKey = useMemo(
    () => fixtures.map((fixture) => fixture.id).join(','),
    [fixtures],
  );

  useEffect(() => {
    if (!enabled || !userTeamId) {
      return;
    }

    const backendUserId = useAppStore.getState().backendUserId;

    let cancelled = false;
    const completedMatchIds = new Set(completedMatches.map((match) => match.id));

    const resolvePendingFixtures = async () => {
      const { scores: cachedScores, pendingMatchIds } = useAiMatchScoresStore.getState();
      const fixturesToResolve = fixtures.filter(
        (fixture) =>
          !completedMatchIds.has(fixture.id) &&
          !matchInvolvesTeam(fixture, userTeamId) &&
          cachedScores[fixture.id] === undefined &&
          !pendingMatchIds.has(fixture.id),
      );

      for (const fixture of fixturesToResolve) {
        useAiMatchScoresStore.getState().markPending(fixture.id);
      }

      try {
        const resolvedScores = await resolveMatchScores({
          fixtures: fixturesToResolve,
          useBackendAi: useGemini,
          backendUserId,
          completedMatches,
          groupStandings,
          language,
          seed: 'ai:batch',
        });

        if (cancelled) {
          return;
        }

        for (const fixture of fixturesToResolve) {
          const score = resolvedScores[fixture.id];

          if (score) {
            useAiMatchScoresStore.getState().upsertScore(fixture.id, score);
          }
        }
      } finally {
        if (!cancelled) {
          for (const fixture of fixturesToResolve) {
            useAiMatchScoresStore.getState().clearPending(fixture.id);
          }
        }
      }
    };

    void resolvePendingFixtures();

    return () => {
      cancelled = true;
    };
  }, [
    completedMatches,
    enabled,
    fixtureIdsKey,
    fixtures,
    groupStandings,
    language,
    useGemini,
    userTeamId,
  ]);

  return scores;
}
