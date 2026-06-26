import { create } from 'zustand';

import type { PeriodScore } from '@/types/match';

type OfficialResultsState = {
  results: Record<string, PeriodScore>;
  fetchedAt: number | null;
  hydrateResults: (results: Record<string, PeriodScore>, fetchedAt?: number | null) => void;
};

export const useOfficialResultsStore = create<OfficialResultsState>((set) => ({
  results: {},
  fetchedAt: null,
  hydrateResults: (results, fetchedAt = Date.now()) => {
    set({
      results,
      fetchedAt,
    });
  },
}));
