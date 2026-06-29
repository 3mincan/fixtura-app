import { hasOfficialFixtureResult } from '@/data/worldcup-fixtures';
import { resolveMatchScores } from '@/simulation/ai';
import { useAppStore } from '@/store/app-store';
import { useAiMatchScoresStore } from '@/store/ai-match-scores-store';
import type { AppLanguage } from '@/types/app-settings';
import type { Match, PeriodScore } from '@/types/match';
import type { Standing } from '@/types/standing';
import { matchInvolvesTeam } from '@/utils/user-matches';

type EnsureAiMatchScoresInput = {
  fixtures: Match[];
  userTeamId: string;
  completedMatchIds: Set<string>;
  completedMatches: Match[];
  groupStandings: Record<string, Standing[]>;
  language: AppLanguage;
  useGemini?: boolean;
  resolvePendingScores?: boolean;
  useOfficialResults?: boolean;
};

export async function ensureAiMatchScoresForFixtures(
  input: EnsureAiMatchScoresInput,
): Promise<void> {
  const {
    fixtures,
    userTeamId,
    completedMatchIds,
    completedMatches,
    groupStandings,
    language,
    useGemini = true,
    resolvePendingScores = false,
    useOfficialResults = true,
  } = input;
  const backendUserId = useAppStore.getState().backendUserId;
  const store = useAiMatchScoresStore.getState();

  const fixturesToResolve = fixtures.filter(
    (fixture) =>
      !completedMatchIds.has(fixture.id) &&
      (!useOfficialResults || !hasOfficialFixtureResult(fixture.id)) &&
      !matchInvolvesTeam(fixture, userTeamId) &&
      store.scores[fixture.id] === undefined &&
      (resolvePendingScores || !store.pendingMatchIds.has(fixture.id)),
  );

  if (fixturesToResolve.length === 0) {
    return;
  }

  for (const fixture of fixturesToResolve) {
    store.markPending(fixture.id);
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

    for (const fixture of fixturesToResolve) {
      const score = resolvedScores[fixture.id];

      if (score) {
        useAiMatchScoresStore.getState().upsertScoreIfMissing(fixture.id, score);
      }
    }
  } finally {
    for (const fixture of fixturesToResolve) {
      useAiMatchScoresStore.getState().clearPending(fixture.id);
    }
  }
}

export function getMissingAiScoreFixtureIds(
  fixtures: Match[],
  userTeamId: string,
  completedMatchIds: Set<string>,
  options: { useOfficialResults?: boolean } = {},
): string[] {
  const store = useAiMatchScoresStore.getState();
  const useOfficialResults = options.useOfficialResults ?? true;

  return fixtures
    .filter(
      (fixture) =>
        !completedMatchIds.has(fixture.id) &&
        (!useOfficialResults || !hasOfficialFixtureResult(fixture.id)) &&
        !matchInvolvesTeam(fixture, userTeamId) &&
        store.scores[fixture.id] === undefined,
    )
    .map((fixture) => fixture.id);
}

export function hasAiScoreForFixture(
  fixture: Match,
  userTeamId: string,
  userPredictions: Record<string, PeriodScore | unknown>,
  completedMatchIds: Set<string>,
  autoSimulateUserMatches = false,
  options: { useOfficialResults?: boolean } = {},
): boolean {
  if (completedMatchIds.has(fixture.id)) {
    return true;
  }

  const useOfficialResults = options.useOfficialResults ?? true;

  if (useOfficialResults && hasOfficialFixtureResult(fixture.id)) {
    return true;
  }

  if (matchInvolvesTeam(fixture, userTeamId)) {
    if (userPredictions[fixture.id] !== undefined) {
      return true;
    }

    return autoSimulateUserMatches;
  }

  return useAiMatchScoresStore.getState().scores[fixture.id] !== undefined;
}
