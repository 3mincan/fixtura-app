export { filterTeams } from '@/utils/filter-teams';
export {
  getNextUserMatch,
  getOpponentTeamId,
  getUserGroupMatches,
  matchInvolvesTeam,
} from '@/utils/user-matches';
export { buildGroupTableRows, getGroupTable } from '@/utils/group-standings';
export type { GroupTable, GroupTableRow } from '@/utils/group-standings';
export {
  canAdvanceReveal,
  formatMatchScore,
  getCurrentRevealMatch,
  getSimulatedGroupMatchesToReveal,
} from '@/utils/result-reveal';
export {
  buildKnockoutBracketView,
  formatKnockoutMatchScore,
  getKnockoutBracketView,
} from '@/utils/knockout-bracket-view';
export type {
  KnockoutBracketMatchView,
  KnockoutBracketRoundView,
  KnockoutBracketView,
} from '@/utils/knockout-bracket-view';
export { createSeededRandom } from '@/utils/seeded-random';
export type { SeededRandom } from '@/utils/seeded-random';
export { pickWeighted } from '@/utils/weighted-random';
export type { WeightedOutcome } from '@/utils/weighted-random';
