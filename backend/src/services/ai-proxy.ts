import type { JsonObject } from '../types.js';

export type MatchScoreProxyInput = {
  fixture: JsonObject;
  language?: string;
  completedMatches?: unknown[];
  groupStandings?: JsonObject;
};

export type MatchScoreProxyOutput = {
  home: number;
  away: number;
  provider: 'gemini';
};

export class AiProxyService {
  constructor(private readonly apiKey: string) {}

  isEnabled(): boolean {
    return this.apiKey.length > 0;
  }

  async resolveMatchScore(input: MatchScoreProxyInput): Promise<MatchScoreProxyOutput> {
    if (!this.isEnabled()) {
      throw new AiProxyUnavailableError('GEMINI_API_KEY is not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: buildPrompt(input),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new AiProxyProviderError(`Gemini request failed with ${response.status}`);
    }

    const payload = await response.json() as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new AiProxyProviderError('Gemini returned an empty response');
    }

    const parsed = JSON.parse(text) as Partial<MatchScoreProxyOutput>;
    const home = toScore(parsed.home);
    const away = toScore(parsed.away);

    return {
      home,
      away,
      provider: 'gemini',
    };
  }
}

export class AiProxyUnavailableError extends Error {
  statusCode = 503;
}

export class AiProxyProviderError extends Error {
  statusCode = 502;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function buildPrompt(input: MatchScoreProxyInput): string {
  return [
    'You are simulating a realistic football tournament match for Fixtura.',
    'Return only JSON with integer fields "home" and "away".',
    'Keep scores realistic: common scores are 0-0, 1-0, 1-1, 2-1, 2-0. Scores above 5 are extremely rare.',
    'Do not use betting, odds, wager, stake, payout, or gambling language.',
    `Language context: ${input.language ?? 'en'}`,
    `Fixture: ${JSON.stringify(input.fixture)}`,
    `Completed matches context: ${JSON.stringify(input.completedMatches ?? [])}`,
    `Group standings context: ${JSON.stringify(input.groupStandings ?? {})}`,
  ].join('\n');
}

function toScore(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9) {
    throw new AiProxyProviderError('Gemini returned an invalid score');
  }

  return value;
}
