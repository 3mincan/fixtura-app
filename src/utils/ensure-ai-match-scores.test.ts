import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { worldCupGroupFixtures } from '@/data/worldcup-fixtures';
import { useAiMatchScoresStore } from '@/store/ai-match-scores-store';
import { ensureAiMatchScoresForFixtures } from '@/utils/ensure-ai-match-scores';

describe('ensureAiMatchScoresForFixtures', () => {
  afterEach(() => {
    useAiMatchScoresStore.getState().reset();
  });

  it('can resolve a currently pending fixture for the instant clock', async () => {
    const fixture = worldCupGroupFixtures.find((match) => match.id === 'group-A-cze-rsa');

    assert.ok(fixture);

    const store = useAiMatchScoresStore.getState();
    store.markPending(fixture.id);

    await ensureAiMatchScoresForFixtures({
      fixtures: [fixture],
      userTeamId: 'mex',
      completedMatchIds: new Set(),
      completedMatches: [],
      groupStandings: {},
      language: 'en',
      useGemini: false,
      resolvePendingScores: true,
    });

    const resolvedScore = useAiMatchScoresStore.getState().scores[fixture.id];

    assert.ok(resolvedScore);
    assert.equal(Number.isInteger(resolvedScore.home), true);
    assert.equal(Number.isInteger(resolvedScore.away), true);
  });
});
