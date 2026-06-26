import { teamRatingsById } from '@/data/team-ratings';
import { teamsById } from '@/data/teams';
import { calculateStandings } from '@/simulation/calculate-standings';
import type { MatchAiRequest } from '@/simulation/ai/types';
import type { AppLanguage } from '@/types/app-settings';
import type { Match } from '@/types/match';
import type { Standing } from '@/types/standing';
import { KNOCKOUT_ROUNDS } from '@/types/knockout';

export type BuildMatchAiRequestInput = {
  fixture: Match;
  completedMatches?: Match[];
  groupStandings?: Record<string, Standing[]>;
  language?: AppLanguage;
};

const VENUE_CLIMATE_NOTES: Record<string, { en: string; tr: string }> = {
  miami: {
    en: 'the weather is very hot and humid',
    tr: 'hava cok sicak ve nemli',
  },
  mexico: {
    en: 'the altitude is high and the weather is warm',
    tr: 'rakim yuksek ve hava sicak',
  },
  guadalajara: {
    en: 'the weather is warm with thin evening air',
    tr: 'hava sicak, aksamlari serinlesiyor',
  },
  atlanta: {
    en: 'the weather is hot and sticky',
    tr: 'hava cok sicak ve bunaltici',
  },
  dallas: {
    en: 'the weather is very hot',
    tr: 'hava cok sicak',
  },
  houston: {
    en: 'the weather is hot and humid',
    tr: 'hava sicak ve nemli',
  },
  los: {
    en: 'the weather is warm and dry',
    tr: 'hava sicak ve kurak',
  },
  seattle: {
    en: 'the weather is mild but can be damp',
    tr: 'hava ilik ama nemli olabilir',
  },
  vancouver: {
    en: 'the weather is mild',
    tr: 'hava ilik',
  },
  toronto: {
    en: 'the weather is warm for early summer',
    tr: 'yaz basinda hava sicak',
  },
  philadelphia: {
    en: 'the weather is warm and humid',
    tr: 'hava sicak ve nemli',
  },
  'new york': {
    en: 'the weather is warm and humid',
    tr: 'hava sicak ve nemli',
  },
  boston: {
    en: 'the weather is warm',
    tr: 'hava sicak',
  },
};

function getVenueClimateNote(ground: string | undefined, language: AppLanguage): string | null {
  if (!ground) {
    return null;
  }

  const normalizedGround = ground.toLowerCase();

  for (const [keyword, note] of Object.entries(VENUE_CLIMATE_NOTES)) {
    if (normalizedGround.includes(keyword)) {
      return note[language === 'tr' ? 'tr' : 'en'];
    }
  }

  return language === 'tr'
    ? 'yaz ortasinda sicak hava bekleniyor'
    : 'warm early-summer conditions are expected';
}

function sortStandings(standings: Standing[]): Standing[] {
  return [...standings].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (right.goalDifference !== left.goalDifference) {
      return right.goalDifference - left.goalDifference;
    }

    return right.goalsFor - left.goalsFor;
  });
}

function getGroupStandingsBeforeMatch(
  fixture: Match,
  completedMatches: Match[],
  groupStandings?: Record<string, Standing[]>,
): Standing[] {
  if (groupStandings && fixture.groupId && groupStandings[fixture.groupId]) {
    return groupStandings[fixture.groupId];
  }

  const priorMatches = completedMatches.filter(
    (match) =>
      match.groupId === fixture.groupId &&
      match.status === 'completed' &&
      match.id !== fixture.id &&
      match.result?.regulation,
  );

  return calculateStandings({
    teamIds: Object.values(teamsById)
      .filter((team) => team.group === fixture.groupId)
      .map((team) => team.id),
    matches: priorMatches,
  });
}

function describeStandingLine(
  teamId: string,
  standings: Standing[],
  language: AppLanguage,
): string {
  const sorted = sortStandings(standings);
  const position = sorted.findIndex((standing) => standing.teamId === teamId) + 1;
  const standing = sorted.find((entry) => entry.teamId === teamId);

  if (!standing || position === 0) {
    return language === 'tr' ? 'henuz mac oynamadi' : 'has not played yet';
  }

  if (language === 'tr') {
    return `${position}. sira, ${standing.points} puan, ${standing.goalsFor}-${standing.goalsAgainst} averaj`;
  }

  return `${position}${getOrdinalSuffix(position)} place, ${standing.points} points, ${standing.goalsFor}-${standing.goalsAgainst} record`;
}

function getOrdinalSuffix(position: number): string {
  if (position % 100 >= 11 && position % 100 <= 13) {
    return 'th';
  }

  switch (position % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function describeQualificationStakes(
  fixture: Match,
  standings: Standing[],
  language: AppLanguage,
): string | null {
  if (!fixture.groupId || standings.length === 0) {
    return null;
  }

  const sorted = sortStandings(standings);
  const homePosition =
    sorted.findIndex((standing) => standing.teamId === fixture.homeTeamId) + 1;
  const awayPosition =
    sorted.findIndex((standing) => standing.teamId === fixture.awayTeamId) + 1;
  const homeTeam = teamsById[fixture.homeTeamId];
  const awayTeam = teamsById[fixture.awayTeamId];

  if (language === 'tr') {
    if (homePosition >= 3 && homePosition <= 4) {
      return `${homeTeam.name} galip gelirse gruptan cikma sansi artar`;
    }

    if (awayPosition >= 3 && awayPosition <= 4) {
      return `${awayTeam.name} galip gelirse gruptan cikma sansi artar`;
    }

    if (homePosition <= 2 || awayPosition <= 2) {
      return 'gruptan cikma yarisi icin kritik bir mac';
    }

    return 'grup sirasi icin onemli bir mac';
  }

  if (homePosition >= 3 && homePosition <= 4) {
    return `a home win would boost ${homeTeam.name}'s knockout qualification chances`;
  }

  if (awayPosition >= 3 && awayPosition <= 4) {
    return `an away win would boost ${awayTeam.name}'s knockout qualification chances`;
  }

  if (homePosition <= 2 || awayPosition <= 2) {
    return 'a critical match for knockout qualification';
  }

  return 'an important match for the group standings';
}

function describeStage(fixture: Match, language: AppLanguage): string {
  if (fixture.stage === 'group') {
    return language === 'tr'
      ? `2026 Dunya Kupasi grup maci, ${fixture.groupId} Grubu`
      : `2026 World Cup group match, Group ${fixture.groupId}`;
  }

  const roundName =
    KNOCKOUT_ROUNDS.find((round) => round.round === fixture.stage)?.name ?? fixture.stage;

  return language === 'tr'
    ? `2026 Dunya Kupasi eleme maci, ${roundName}`
    : `2026 World Cup knockout match, ${roundName}`;
}

function describeTeamProfile(teamId: string, language: AppLanguage): string {
  const team = teamsById[teamId];
  const rating = teamRatingsById[teamId];

  if (!rating) {
    return team.name;
  }

  if (language === 'tr') {
    return `${team.name} (${rating.overall} guc, form ${rating.form})`;
  }

  return `${team.name} (${rating.overall} overall, ${rating.form} form)`;
}

export function buildMatchAiRequest(input: BuildMatchAiRequestInput): MatchAiRequest {
  const { fixture, completedMatches = [], groupStandings, language = 'en' } = input;
  const homeTeam = teamsById[fixture.homeTeamId];
  const awayTeam = teamsById[fixture.awayTeamId];
  const venue = fixture.ground ?? 'neutral venue';
  const climateNote = getVenueClimateNote(fixture.ground, language);
  const stageLabel = describeStage(fixture, language);
  const standings =
    fixture.stage === 'group'
      ? getGroupStandingsBeforeMatch(fixture, completedMatches, groupStandings)
      : [];
  const stakes =
    fixture.stage === 'group'
      ? describeQualificationStakes(fixture, standings, language)
      : language === 'tr'
        ? 'eleme turunda kazanan devam eder'
        : 'the winner advances in the knockout stage';

  const contextParts = [
    stageLabel,
    language === 'tr' ? `mac ${venue}'de oynaniyor` : `the match is in ${venue}`,
    climateNote,
    language === 'tr'
      ? `${describeTeamProfile(fixture.homeTeamId, language)} ev sahibi`
      : `${describeTeamProfile(fixture.homeTeamId, language)} are home`,
    language === 'tr'
      ? `${describeTeamProfile(fixture.awayTeamId, language)} deplasmanda`
      : `${describeTeamProfile(fixture.awayTeamId, language)} are away`,
  ];

  if (fixture.stage === 'group' && standings.length > 0) {
    contextParts.push(
      language === 'tr'
        ? `Ev sahibi durumu: ${describeStandingLine(fixture.homeTeamId, standings, language)}`
        : `Home standing: ${describeStandingLine(fixture.homeTeamId, standings, language)}`,
      language === 'tr'
        ? `Deplasman durumu: ${describeStandingLine(fixture.awayTeamId, standings, language)}`
        : `Away standing: ${describeStandingLine(fixture.awayTeamId, standings, language)}`,
    );
  }

  if (stakes) {
    contextParts.push(stakes);
  }

  return {
    context: contextParts.filter(Boolean).join('. '),
    homeTeam: homeTeam.name.toLowerCase(),
    awayTeam: awayTeam.name.toLowerCase(),
  };
}
