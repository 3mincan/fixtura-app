import type { TournamentJourneyPhase } from '@/simulation/tournament-journey';

const TERMINAL_PHASES: TournamentJourneyPhase[] = [
  'champion',
  'eliminated',
  'not-qualified',
];

export function isTerminalTournamentPhase(phase: TournamentJourneyPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}
