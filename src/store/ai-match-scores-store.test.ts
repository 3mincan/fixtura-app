import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { useAiMatchScoresStore } from '@/store/ai-match-scores-store';

describe('useAiMatchScoresStore', () => {
  afterEach(() => {
    useAiMatchScoresStore.getState().reset();
  });

  it('does not replace an existing score when inserting missing-only scores', () => {
    const store = useAiMatchScoresStore.getState();

    store.upsertScore('fixture-1', { home: 1, away: 0 });
    useAiMatchScoresStore
      .getState()
      .upsertScoreIfMissing('fixture-1', { home: 3, away: 2 });

    assert.deepEqual(useAiMatchScoresStore.getState().scores['fixture-1'], {
      home: 1,
      away: 0,
    });
  });
});
