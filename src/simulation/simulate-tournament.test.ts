import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { simulateTournament } from '@/simulation/simulate-tournament';
import type { Group } from '@/types/group';

function buildGroupsFromTeams(): Group[] {
  const teamIdsByGroup = new Map<string, string[]>();

  for (const team of teams) {
    const groupTeamIds = teamIdsByGroup.get(team.group) ?? [];
    groupTeamIds.push(team.id);
    teamIdsByGroup.set(team.group, groupTeamIds);
  }

  return [...teamIdsByGroup.entries()]
    .sort(([groupA], [groupB]) => groupA.localeCompare(groupB))
    .map(([id, teamIds]) => ({ id, teamIds }));
}

function makeTournamentInput(seed: string | number) {
  return {
    teams,
    groups: buildGroupsFromTeams(),
    ratings: teamRatingsById,
    seed,
  };
}

describe('simulateTournament', () => {
  it('returns group stage, knockout stage and a champion', () => {
    const output = simulateTournament(makeTournamentInput('worldcup2026'));

    assert.equal(output.groupStage.results.length, 72);
    assert.equal(output.groupStage.qualifiedTeamIds.length, 24);
    assert.equal(output.knockoutStage.rounds.length, 6);
    assert.equal(output.championId, output.knockoutStage.championId);
    assert.ok(output.championId);
  });

  it('always produces exactly one champion', () => {
    const seeds = ['tournament-a', 'tournament-b', 'tournament-c', 'tournament-d', 'tournament-e'];

    for (const seed of seeds) {
      const output = simulateTournament(makeTournamentInput(seed));

      assert.ok(output.championId);
      assert.equal(output.championId, output.knockoutStage.final.winnerTeamId);
      assert.ok(teams.some((team) => team.id === output.championId));
    }
  });

  it('produces the same champion for the same seed', () => {
    const input = makeTournamentInput('deterministic-tournament');
    const first = simulateTournament(input);
    const second = simulateTournament(input);

    assert.equal(second.championId, first.championId);
    assert.deepEqual(second.groupStage.results, first.groupStage.results);
    assert.deepEqual(second.knockoutStage.rounds, first.knockoutStage.rounds);
  });

  it('may produce different champions for different seeds', () => {
    const champions = new Set(
      Array.from({ length: 20 }, (_, index) =>
        simulateTournament(makeTournamentInput(`tournament-seed-${index}`)).championId,
      ),
    );

    assert.ok(champions.size > 1);
  });
});
