import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildMatchAiRequest } from '@/simulation/ai/build-match-ai-request';
import {
  fetchGeminiMatchScore,
  GeminiRequestError,
  parseGeminiMatchScore,
  parseGeminiMatchScores,
} from '@/simulation/ai/gemini-match-score';
import { resolveMatchScores, simulateRatingBasedFallbackScore } from '@/simulation/ai/resolve-match-score';
import type { TeamRating } from '@/types/team';
import type { Match } from '@/types/match';

const sampleMatch: Match = {
  id: 'group-D-ger-nor',
  stage: 'group',
  homeTeamId: 'ger',
  awayTeamId: 'nor',
  status: 'scheduled',
  groupId: 'D',
  round: 'Matchday 3',
  scheduledDate: '2026-06-20',
  scheduledTime: '15:00 UTC-4',
  ground: 'Miami',
};

describe('buildMatchAiRequest', () => {
  it('builds a Gemini request payload with match context and team names', () => {
    const request = buildMatchAiRequest({
      fixture: sampleMatch,
      language: 'tr',
    });

    assert.match(request.context, /Dunya Kupasi/i);
    assert.match(request.context, /Miami/i);
    assert.match(request.context, /sicak/i);
    assert.equal(request.homeTeam, 'germany');
    assert.equal(request.awayTeam, 'norway');
  });
});

describe('parseGeminiMatchScore', () => {
  it('parses a plain JSON score response', () => {
    assert.deepEqual(parseGeminiMatchScore('{"home": 2, "away": 1}'), {
      home: 2,
      away: 1,
    });
  });

  it('parses fenced JSON score responses', () => {
    assert.deepEqual(
      parseGeminiMatchScore('```json\n{"home": 0, "away": 0}\n```'),
      { home: 0, away: 0 },
    );
  });
});

describe('parseGeminiMatchScores', () => {
  it('parses a batch JSON score response', () => {
    assert.deepEqual(
      parseGeminiMatchScores(
        '{"scores":[{"id":"match-1","home":2,"away":1},{"id":"match-2","home":0,"away":0}]}',
      ),
      [
        { id: 'match-1', home: 2, away: 1 },
        { id: 'match-2', home: 0, away: 0 },
      ],
    );
  });
});

describe('fetchGeminiMatchScore', () => {
  it('throws a rate-limit error with retry timing for Gemini 429 responses', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            message: 'Quota exceeded. Please retry in 17.5s.',
          },
        }),
        { status: 429 },
      );

    try {
      await assert.rejects(
        () =>
          fetchGeminiMatchScore(
            { context: 'test', homeTeam: 'team a', awayTeam: 'team b' },
            'test-key',
          ),
        (error) => {
          assert.ok(error instanceof GeminiRequestError);
          assert.equal(error.status, 429);
          assert.equal(error.retryAfterMs, 17_500);

          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('simulateRatingBasedFallbackScore', () => {
  const strongRating: TeamRating = {
    teamId: 'strong',
    overall: 92,
    attack: 95,
    defence: 90,
    form: 90,
    tournamentExperience: 96,
    elo: 2050,
    attackStrength: 1.55,
    defensiveStrength: 0.78,
    championshipProbability: 0.18,
  };
  const weakRating: TeamRating = {
    teamId: 'weak',
    overall: 58,
    attack: 56,
    defence: 55,
    form: 57,
    tournamentExperience: 42,
    elo: 1500,
    attackStrength: 0.78,
    defensiveStrength: 1.28,
    championshipProbability: 0.0005,
  };
  const fixture: Match = {
    id: 'fallback-strong-weak',
    stage: 'group',
    homeTeamId: 'strong',
    awayTeamId: 'weak',
    status: 'scheduled',
  };

  it('is deterministic for the same seed', () => {
    const first = simulateRatingBasedFallbackScore(
      fixture,
      { strong: strongRating, weak: weakRating },
      'fallback-seed',
    );
    const second = simulateRatingBasedFallbackScore(
      fixture,
      { strong: strongRating, weak: weakRating },
      'fallback-seed',
    );

    assert.deepEqual(second, first);
  });

  it('favours teams with better Elo, strengths, overall and championship probability', () => {
    let strongWins = 0;
    let weakWins = 0;

    for (let index = 0; index < 120; index += 1) {
      const score = simulateRatingBasedFallbackScore(
        fixture,
        { strong: strongRating, weak: weakRating },
        `fallback-${index}`,
      );

      if (score.home > score.away) {
        strongWins += 1;
      } else if (score.away > score.home) {
        weakWins += 1;
      }
    }

    assert.ok(strongWins > weakWins);
  });
});

describe('resolveMatchScores', () => {
  it('generates local scores without calling the backend when remote AI is disabled', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;

    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    };

    try {
      const scores = await resolveMatchScores({
        fixtures: [sampleMatch],
        useBackendAi: false,
        seed: 'local-generate',
      });

      assert.equal(fetchCalled, false);
      assert.ok(scores[sampleMatch.id]);
      assert.ok(Number.isInteger(scores[sampleMatch.id]?.home));
      assert.ok(Number.isInteger(scores[sampleMatch.id]?.away));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
