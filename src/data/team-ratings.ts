import worldCupTeamsJson from '../../worldcup.teams.json';

import { type WorldCupTeamSource } from '@/data/worldcup-team-source';
import type { TeamRating } from '@/types/team';

const ELO_MIN = 1400;
const ELO_MAX = 2100;
const DEFAULT_ELO = 1650;
const DEFAULT_STRENGTH = 1;
const DEFAULT_OVERALL = 65;
const DEFAULT_CHAMPIONSHIP_PROBABILITY = 0.001;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOrDefault(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value! : fallback;
}

function normalizeElo(elo: number): number {
  return clamp(((elo - ELO_MIN) / (ELO_MAX - ELO_MIN)) * 100, 1, 100);
}

function normalizeStrength(strength: number): number {
  return clamp(strength * 70, 1, 100);
}

function normalizeDefence(defensiveStrength: number): number {
  return clamp((2 - defensiveStrength) * 70, 1, 100);
}

function normalizeChampionshipProbability(probability: number): number {
  return clamp(35 + Math.log1p(probability * 100) * 30, 1, 100);
}

function buildTeamRating(source: WorldCupTeamSource): TeamRating {
  const elo = finiteOrDefault(source.elo, DEFAULT_ELO);
  const attackStrength = finiteOrDefault(source.attack_strength, DEFAULT_STRENGTH);
  const defensiveStrength = finiteOrDefault(source.defensive_strength, DEFAULT_STRENGTH);
  const overallStrength = finiteOrDefault(source.overall_strength, DEFAULT_OVERALL);
  const championshipProbability = finiteOrDefault(
    source.championship_probability,
    DEFAULT_CHAMPIONSHIP_PROBABILITY,
  );
  const eloScore = normalizeElo(elo);
  const probabilityScore = normalizeChampionshipProbability(championshipProbability);

  return {
    teamId: source.fifa_code.toLowerCase(),
    overall: Math.round(clamp(overallStrength, 1, 100)),
    attack: Math.round(normalizeStrength(attackStrength)),
    defence: Math.round(normalizeDefence(defensiveStrength)),
    form: Math.round(clamp(overallStrength * 0.7 + eloScore * 0.3, 1, 100)),
    tournamentExperience: Math.round(clamp(overallStrength * 0.45 + probabilityScore * 0.55, 1, 100)),
    elo,
    attackStrength,
    defensiveStrength,
    championshipProbability,
  };
}

export const teamRatings: TeamRating[] = (worldCupTeamsJson as WorldCupTeamSource[]).map(
  buildTeamRating,
);

export const teamRatingsById: Record<string, TeamRating> = Object.fromEntries(
  teamRatings.map((rating) => [rating.teamId, rating]),
);

const RATING_MIN = 1;
const RATING_MAX = 100;

function assertRatingValue(value: number, teamId: string, field: string): void {
  if (value < RATING_MIN || value > RATING_MAX) {
    throw new Error(`Invalid ${field} for ${teamId}: ${value} (expected ${RATING_MIN}-${RATING_MAX})`);
  }
}

function assertTeamRatingsComplete(ratings: TeamRating[]): void {
  const seen = new Set<string>();

  for (const rating of ratings) {
    if (seen.has(rating.teamId)) {
      throw new Error(`Duplicate rating for team: ${rating.teamId}`);
    }
    seen.add(rating.teamId);

    assertRatingValue(rating.overall, rating.teamId, 'overall');
    assertRatingValue(rating.attack, rating.teamId, 'attack');
    assertRatingValue(rating.defence, rating.teamId, 'defence');
    assertRatingValue(rating.form, rating.teamId, 'form');
    assertRatingValue(rating.tournamentExperience, rating.teamId, 'tournamentExperience');
  }

  if (seen.size !== ratings.length) {
    throw new Error(`Expected unique ratings, found ${ratings.length} ratings and ${seen.size} ids`);
  }
}

assertTeamRatingsComplete(teamRatings);
