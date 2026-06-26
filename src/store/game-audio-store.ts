import { create } from 'zustand';

import type { GameMusicScene, GameSoundEffect } from '@/audio/game-sound-assets';

type GameAudioStore = {
  musicScene: GameMusicScene;
  soundEffectRequest: { effect: GameSoundEffect; id: number } | null;
  setMusicScene: (scene: GameMusicScene) => void;
  playSoundEffect: (effect: GameSoundEffect) => void;
  clearSoundEffectRequest: (id: number) => void;
};

let soundEffectRequestId = 0;

export function queueGameSoundEffect(effect: GameSoundEffect) {
  useGameAudioStore.getState().playSoundEffect(effect);
}

export const useGameAudioStore = create<GameAudioStore>((set, get) => ({
  musicScene: 'none',
  soundEffectRequest: null,

  setMusicScene: (scene) => {
    if (get().musicScene === scene) {
      return;
    }

    set({ musicScene: scene });
  },

  playSoundEffect: (effect) => {
    soundEffectRequestId += 1;

    set({
      soundEffectRequest: {
        effect,
        id: soundEffectRequestId,
      },
    });
  },

  clearSoundEffectRequest: (id) => {
    const current = get().soundEffectRequest;

    if (current?.id === id) {
      set({ soundEffectRequest: null });
    }
  },
}));
