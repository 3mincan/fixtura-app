import type {
  MatchAiBatchRequest,
  MatchAiBatchScore,
  MatchAiRequest,
  MatchAiScore,
} from '@/simulation/ai/types';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class GeminiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'GeminiRequestError';
  }
}

function parseRetryDelayMs(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const secondsMatch = value.match(/retry in ([\d.]+)s/i);

  if (secondsMatch?.[1]) {
    return Math.max(0, Number(secondsMatch[1]) * 1000);
  }

  return null;
}

function buildPrompt(request: MatchAiRequest): string {
  return [
    'You are a football score predictor for a World Cup simulation game.',
    'Return ONLY valid JSON with integer scores between 0 and 9.',
    'Use realistic football scorelines. Most matches finish 0-0, 1-0, 1-1, 2-1, or 2-0.',
    'Do not include commentary or extra fields.',
    'Response format: {"home": number, "away": number}',
    '',
    JSON.stringify(request),
  ].join('\n');
}

function buildBatchPrompt(requests: MatchAiBatchRequest[]): string {
  return [
    'You are a football score predictor for a World Cup simulation game.',
    'Return ONLY valid JSON with integer scores between 0 and 9.',
    'Use realistic football scorelines. Most matches finish 0-0, 1-0, 1-1, 2-1, or 2-0.',
    'Return exactly one score for every input match id. Do not omit or add matches.',
    'Do not include commentary or extra fields.',
    'Response format: {"scores":[{"id":"match-id","home":number,"away":number}]}',
    '',
    JSON.stringify({ matches: requests }),
  ].join('\n');
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!objectMatch) {
    throw new Error('Gemini response did not include JSON');
  }

  return objectMatch[0];
}

export function parseGeminiMatchScore(text: string): MatchAiScore {
  const parsed = JSON.parse(extractJsonObject(text)) as Partial<MatchAiScore>;
  const home = Number(parsed.home);
  const away = Number(parsed.away);

  if (
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 9 ||
    away > 9
  ) {
    throw new Error('Gemini returned an invalid match score');
  }

  return { home, away };
}

function parseScoreValue(value: unknown): MatchAiScore {
  const parsed = value as Partial<MatchAiScore>;
  const home = Number(parsed.home);
  const away = Number(parsed.away);

  if (
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 9 ||
    away > 9
  ) {
    throw new Error('Gemini returned an invalid match score');
  }

  return { home, away };
}

export function parseGeminiMatchScores(text: string): MatchAiBatchScore[] {
  const parsed = JSON.parse(extractJsonObject(text)) as {
    scores?: Array<Partial<MatchAiBatchScore>>;
  };

  if (!Array.isArray(parsed.scores)) {
    throw new Error('Gemini batch response did not include scores');
  }

  return parsed.scores.map((score) => {
    if (typeof score.id !== 'string' || score.id.length === 0) {
      throw new Error('Gemini batch response included a score without an id');
    }

    return {
      id: score.id,
      ...parseScoreValue(score),
    };
  });
}

async function postGeminiPrompt(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    const message = payload.error?.message ?? `Gemini request failed with ${response.status}`;

    throw new GeminiRequestError(
      message,
      response.status,
      parseRetryDelayMs(response.headers.get('retry-after')) ?? parseRetryDelayMs(message),
    );
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned an empty score response');
  }

  return text;
}

export async function fetchGeminiMatchScore(
  request: MatchAiRequest,
  apiKey: string,
): Promise<MatchAiScore> {
  const text = await postGeminiPrompt(buildPrompt(request), apiKey);
  return parseGeminiMatchScore(text);
}

export async function fetchGeminiMatchScores(
  requests: MatchAiBatchRequest[],
  apiKey: string,
): Promise<Record<string, MatchAiScore>> {
  if (requests.length === 0) {
    return {};
  }

  const text = await postGeminiPrompt(buildBatchPrompt(requests), apiKey);
  const expectedIds = new Set(requests.map((request) => request.id));
  const scores = parseGeminiMatchScores(text);
  const scoreMap: Record<string, MatchAiScore> = {};

  for (const score of scores) {
    if (!expectedIds.has(score.id)) {
      continue;
    }

    scoreMap[score.id] = {
      home: score.home,
      away: score.away,
    };
  }

  for (const request of requests) {
    if (!scoreMap[request.id]) {
      throw new Error(`Gemini batch response omitted match score: ${request.id}`);
    }
  }

  return scoreMap;
}
