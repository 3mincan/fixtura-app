import type { Match } from '@/types/match';
import {
  MATCH_HALFTIME_MINUTES,
  MATCH_HALF_MINUTES,
  parseMatchKickoff,
} from '@/utils/matchday-clock';
import { createSeededRandom } from '@/utils/seeded-random';

export type LiveGoalEvent = {
  playingMinute: number;
  team: 'home' | 'away';
};

export const INSTANT_GOAL_STEP_MS = 700;

export function buildGoalTimeline(
  matchId: string,
  finalHome: number,
  finalAway: number,
): LiveGoalEvent[] {
  const random = createSeededRandom(`live-goals:${matchId}:${finalHome}-${finalAway}`);
  const homeMinutes = assignGoalMinutes(finalHome, random, 'first');
  const awayMinutes = assignGoalMinutes(finalAway, random, 'second');

  const events: LiveGoalEvent[] = [
    ...homeMinutes.map((playingMinute) => ({ playingMinute, team: 'home' as const })),
    ...awayMinutes.map((playingMinute) => ({ playingMinute, team: 'away' as const })),
  ];

  return events.sort((eventA, eventB) => eventA.playingMinute - eventB.playingMinute);
}

function assignGoalMinutes(
  count: number,
  random: ReturnType<typeof createSeededRandom>,
  half: 'first' | 'second',
): number[] {
  if (count === 0) {
    return [];
  }

  const minMinute = half === 'first' ? 5 : 50;
  const maxMinute = half === 'first' ? 44 : 88;
  const minutes: number[] = [];

  for (let index = 0; index < count; index += 1) {
    let minute = random.nextInt(minMinute, maxMinute);

    while (minutes.includes(minute)) {
      minute = Math.min(maxMinute, minute + 1);
    }

    minutes.push(minute);
  }

  return minutes.sort((minuteA, minuteB) => minuteA - minuteB);
}

export function getMatchElapsedClockMinutes(match: Match, clock: Date): number {
  const kickoff = parseMatchKickoff(match);

  if (!kickoff) {
    return 0;
  }

  const elapsedMs = clock.getTime() - kickoff.getTime();

  if (elapsedMs <= 0) {
    return 0;
  }

  return elapsedMs / 60_000;
}

export function getPlayingMinuteFromClockMinutes(clockMinutes: number): number {
  if (clockMinutes <= 0) {
    return 0;
  }

  if (clockMinutes <= MATCH_HALF_MINUTES) {
    return Math.floor(clockMinutes);
  }

  if (clockMinutes < MATCH_HALF_MINUTES + MATCH_HALFTIME_MINUTES) {
    return MATCH_HALF_MINUTES;
  }

  const secondHalfMinutes = clockMinutes - (MATCH_HALF_MINUTES + MATCH_HALFTIME_MINUTES);

  return Math.min(MATCH_HALF_MINUTES + Math.floor(secondHalfMinutes), 90);
}

export function getPlayingMinuteFromClock(match: Match, clock: Date): number {
  return getPlayingMinuteFromClockMinutes(getMatchElapsedClockMinutes(match, clock));
}

export function getLiveScoreAtPlayingMinute(
  timeline: LiveGoalEvent[],
  playingMinute: number,
): { home: number; away: number } {
  let home = 0;
  let away = 0;

  for (const event of timeline) {
    if (event.playingMinute > playingMinute) {
      break;
    }

    if (event.team === 'home') {
      home += 1;
    } else {
      away += 1;
    }
  }

  return { home, away };
}

export function getLiveScoreForMatch(
  match: Match,
  clock: Date,
  finalHome: number,
  finalAway: number,
): { home: number; away: number } {
  const timeline = buildGoalTimeline(match.id, finalHome, finalAway);
  const playingMinute = getPlayingMinuteFromClock(match, clock);

  return getLiveScoreAtPlayingMinute(timeline, playingMinute);
}

export function getClockAtPlayingMinute(match: Match, playingMinute: number): Date | null {
  const kickoff = parseMatchKickoff(match);

  if (!kickoff) {
    return null;
  }

  const clockMinuteOffset =
    playingMinute <= MATCH_HALF_MINUTES
      ? playingMinute
      : MATCH_HALF_MINUTES + MATCH_HALFTIME_MINUTES + (playingMinute - MATCH_HALF_MINUTES);

  return new Date(kickoff.getTime() + clockMinuteOffset * 60_000);
}

export type LiveScoreClockEvent = {
  time: Date;
  kind: 'goal' | 'full-time';
};

export function buildLiveScoreClockEvents(
  fixtures: Match[],
  finalScores: Map<string, { home: number; away: number }>,
  getEndTime: (match: Match) => Date | null,
): LiveScoreClockEvent[] {
  const events: LiveScoreClockEvent[] = [];

  for (const fixture of fixtures) {
    const finalScore = finalScores.get(fixture.id);

    if (!finalScore) {
      continue;
    }

    const timeline = buildGoalTimeline(fixture.id, finalScore.home, finalScore.away);

    for (const goal of timeline) {
      const goalTime = getClockAtPlayingMinute(fixture, goal.playingMinute);

      if (goalTime) {
        events.push({ time: goalTime, kind: 'goal' });
      }
    }

    const endTime = getEndTime(fixture);

    if (endTime) {
      events.push({ time: endTime, kind: 'full-time' });
    }
  }

  return events.sort((eventA, eventB) => eventA.time.getTime() - eventB.time.getTime());
}

export function getNextLiveScoreClockEvents(
  events: LiveScoreClockEvent[],
  clock: Date,
): LiveScoreClockEvent[] {
  const clockMs = clock.getTime();

  return events.filter((event) => event.time.getTime() > clockMs);
}
