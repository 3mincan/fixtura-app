import { create } from 'zustand';

import type { PeriodScore } from '@/types/match';

type AiMatchScoresState = {
  scores: Record<string, PeriodScore>;
  pendingMatchIds: Set<string>;
  upsertScore: (matchId: string, score: PeriodScore) => void;
  markPending: (matchId: string) => void;
  clearPending: (matchId: string) => void;
  reset: () => void;
};

export const useAiMatchScoresStore = create<AiMatchScoresState>((set) => ({
  scores: {},
  pendingMatchIds: new Set(),
  upsertScore: (matchId, score) => {
    set((state) => ({
      scores: {
        ...state.scores,
        [matchId]: score,
      },
    }));
  },
  markPending: (matchId) => {
    set((state) => {
      const pendingMatchIds = new Set(state.pendingMatchIds);
      pendingMatchIds.add(matchId);

      return { pendingMatchIds };
    });
  },
  clearPending: (matchId) => {
    set((state) => {
      const pendingMatchIds = new Set(state.pendingMatchIds);
      pendingMatchIds.delete(matchId);

      return { pendingMatchIds };
    });
  },
  reset: () => {
    set({
      scores: {},
      pendingMatchIds: new Set(),
    });
  },
}));
