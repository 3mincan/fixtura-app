import { getWorldCupKnockoutFixtures } from '@/data/worldcup-fixtures';
import {
  assignThirdPlaceTeams,
  parseKnockoutPlaceholder,
  resolveGroupPositionPlaceholder,
  selectBestThirdPlaceTeams,
  type ThirdPlaceSlot,
} from '@/simulation/resolve-knockout-placeholders';
import type { KnockoutBracketMatch } from '@/types/knockout';
import type { Standing } from '@/types/standing';

export function buildRoundOf32FromFixtures(
  standings: Record<string, Standing[]>,
): KnockoutBracketMatch[] {
  const qualifiedThirdPlaces = selectBestThirdPlaceTeams(standings);
  const roundOf32Fixtures = getWorldCupKnockoutFixtures('Round of 32');
  const thirdPlaceSlots: ThirdPlaceSlot[] = [];

  for (const fixture of roundOf32Fixtures) {
    for (const [side, placeholder] of [
      ['home', fixture.homePlaceholder],
      ['away', fixture.awayPlaceholder],
    ] as const) {
      const parsed = parseKnockoutPlaceholder(placeholder);

      if (parsed.type === 'third-place') {
        thirdPlaceSlots.push({
          key: `${fixture.num}-${side}`,
          eligibleGroups: parsed.eligibleGroups,
        });
      }
    }
  }

  const thirdPlaceAssignments = assignThirdPlaceTeams(thirdPlaceSlots, qualifiedThirdPlaces);

  return roundOf32Fixtures.map((fixture) => {
    const resolveSlot = (placeholder: string, side: 'home' | 'away') => {
      const parsed = parseKnockoutPlaceholder(placeholder);

      if (parsed.type === 'group-position') {
        return resolveGroupPositionPlaceholder(placeholder, standings);
      }

      return thirdPlaceAssignments[`${fixture.num}-${side}`]!;
    };

    const homeTeamId = resolveSlot(fixture.homePlaceholder, 'home');
    const awayTeamId = resolveSlot(fixture.awayPlaceholder, 'away');

    return {
      id: `r32-${fixture.num}`,
      round: 'round-of-32' as const,
      slot: fixture.num - roundOf32Fixtures[0]!.num + 1,
      homeTeamId,
      awayTeamId,
      fixtureNum: fixture.num,
      scheduledDate: fixture.scheduledDate,
      scheduledTime: fixture.scheduledTime,
      ground: fixture.ground,
    };
  });
}
