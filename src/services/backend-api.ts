import { getBackendBaseUrl } from '@/config/backend-url';
import type { FixtureSourceFile } from '@/data/worldcup-fixtures';
import type { AppLanguage } from '@/types/app-settings';
import type { Match, PeriodScore } from '@/types/match';
import type { RemoteConfig } from '@/types/remote-config';
import type { Standing } from '@/types/standing';

type BackendScoreResponse = {
  score?: {
    home?: unknown;
    away?: unknown;
  };
};

type RemoteConfigResponse = {
  config?: RemoteConfig;
};

type BackendSessionResponse = {
  user?: {
    id?: unknown;
  };
};

type BackendSimulationPayload = {
  id: string;
  selectedTeamId: string;
  gameMode: 'predict' | 'random';
  tournamentPhase: string;
  currentStage: string;
  championId: string | null;
  progress: Record<string, unknown>;
};

type WorldCup2026Response = {
  data?: unknown;
  fetchedAt?: unknown;
  sourceUrl?: unknown;
};

const REQUEST_TIMEOUT_MS = 12_000;

export async function fetchRemoteConfig(): Promise<RemoteConfigResponse['config'] | null> {
  const response = await fetchWithTimeout('/remote-config', {
    method: 'GET',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as RemoteConfigResponse;
  return payload.config ?? null;
}

export async function createBackendSession(anonymousId: string): Promise<string | null> {
  const response = await fetchWithTimeout('/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ anonymousId }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as BackendSessionResponse;
  return typeof payload.user?.id === 'string' ? payload.user.id : null;
}

export async function recordBackendEventsBatch(input: {
  userId?: string | null;
  events: {
    name: string;
    payload?: Record<string, unknown>;
    clientCreatedAt?: number;
  }[];
}): Promise<void> {
  if (input.events.length === 0) {
    return;
  }

  const response = await fetchWithTimeout('/events/batch', {
    method: 'POST',
    headers: buildEventHeaders(input.userId),
    body: JSON.stringify({ events: input.events }),
  });

  if (!response.ok) {
    throw new Error(`Events batch request failed (${response.status})`);
  }
}

export async function recordBackendEvent(input: {
  name: string;
  payload?: Record<string, unknown>;
  userId?: string | null;
  clientCreatedAt?: number;
}): Promise<void> {
  await recordBackendEventsBatch({
    userId: input.userId,
    events: [
      {
        name: input.name,
        payload: input.payload,
        clientCreatedAt: input.clientCreatedAt,
      },
    ],
  });
}

function buildEventHeaders(userId?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
  };
}

export async function saveBackendSimulation(input: {
  userId: string;
  simulation: BackendSimulationPayload;
}): Promise<boolean> {
  const response = await fetchWithTimeout(
    `/simulations/${encodeURIComponent(input.simulation.id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': input.userId,
      },
      body: JSON.stringify(input.simulation),
    },
  );

  return response.ok;
}

export async function resolveBackendMatchScore(input: {
  fixture: Match;
  completedMatches?: Match[];
  groupStandings?: Record<string, Standing[]>;
  language?: AppLanguage;
  userId?: string | null;
}): Promise<PeriodScore | null> {
  const response = await fetchWithTimeout('/ai/match-score', {
    method: 'POST',
    headers: buildEventHeaders(input.userId),
    body: JSON.stringify({
      fixture: input.fixture,
      completedMatches: input.completedMatches ?? [],
      groupStandings: input.groupStandings ?? {},
      language: input.language ?? 'en',
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as BackendScoreResponse;
  const { home, away } = payload.score ?? {};

  if (!isValidScore(home) || !isValidScore(away)) {
    return null;
  }

  return { home, away };
}

export async function fetchWorldCup2026Data(): Promise<FixtureSourceFile | null> {
  const response = await fetchWithTimeout('/worldcup/2026', {
    method: 'GET',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as WorldCup2026Response;

  if (!isFixtureSourceFile(payload.data)) {
    return null;
  }

  return payload.data;
}

async function fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${getBackendBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 9;
}

function isFixtureSourceFile(value: unknown): value is FixtureSourceFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { name?: unknown; matches?: unknown };

  return typeof candidate.name === 'string' && Array.isArray(candidate.matches);
}
