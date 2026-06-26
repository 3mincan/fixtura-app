import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { GAME_SOUND_ASSETS } from '@/audio/game-sound-assets';
import { useAppStore } from '@/store/app-store';
import { useGameAudioStore } from '@/store/game-audio-store';
import { useTournamentStore } from '@/store/tournament-store';

type GameAudioProviderProps = {
  children: ReactNode;
};

export function GameAudioProvider({ children }: GameAudioProviderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return children;
  }

  return <GameAudioProviderInner>{children}</GameAudioProviderInner>;
}

function GameAudioProviderInner({ children }: GameAudioProviderProps) {
  const musicEnabled = useAppStore((state) => state.musicEnabled);
  const soundEffectsEnabled = useAppStore((state) => state.soundEffectsEnabled);
  const musicScene = useGameAudioStore((state) => state.musicScene);
  const soundEffectRequest = useGameAudioStore((state) => state.soundEffectRequest);
  const clearSoundEffectRequest = useGameAudioStore((state) => state.clearSoundEffectRequest);
  const playSoundEffect = useGameAudioStore((state) => state.playSoundEffect);
  const tournamentPhase = useTournamentStore((state) => state.tournamentPhase);

  const mainMenuPlayer = useAudioPlayer(GAME_SOUND_ASSETS.mainMenu);
  const userMatchPlayer = useAudioPlayer(GAME_SOUND_ASSETS.userMatch);
  const eliminatedPlayer = useAudioPlayer(GAME_SOUND_ASSETS.eliminated);
  const wonCupPlayer = useAudioPlayer(GAME_SOUND_ASSETS.wonCup);
  const tournamentEndPlayer = useAudioPlayer(GAME_SOUND_ASSETS.tournamentEnd);

  const previousPhaseRef = useRef(tournamentPhase);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
    });
  }, []);

  useEffect(() => {
    mainMenuPlayer.loop = true;
    userMatchPlayer.loop = true;
  }, [mainMenuPlayer, userMatchPlayer]);

  useEffect(() => {
    const pausePlayer = (player: typeof mainMenuPlayer) => {
      if (player.playing) {
        player.pause();
      }
    };

    if (!musicEnabled) {
      pausePlayer(mainMenuPlayer);
      pausePlayer(userMatchPlayer);
      return;
    }

    if (musicScene === 'main-menu') {
      pausePlayer(userMatchPlayer);

      if (!mainMenuPlayer.playing) {
        mainMenuPlayer.play();
      }

      return;
    }

    if (musicScene === 'user-match') {
      pausePlayer(mainMenuPlayer);

      if (!userMatchPlayer.playing) {
        userMatchPlayer.play();
      }

      return;
    }

    pausePlayer(mainMenuPlayer);
    pausePlayer(userMatchPlayer);
  }, [mainMenuPlayer, musicEnabled, musicScene, userMatchPlayer]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = tournamentPhase;

    if (previousPhase === tournamentPhase) {
      return;
    }

    if (tournamentPhase === 'eliminated' || tournamentPhase === 'not-qualified') {
      playSoundEffect('eliminated');
    }
  }, [playSoundEffect, tournamentPhase]);

  useEffect(() => {
    if (!soundEffectRequest || !soundEffectsEnabled) {
      return;
    }

    const { effect, id } = soundEffectRequest;
    const player =
      effect === 'eliminated'
        ? eliminatedPlayer
        : effect === 'won-cup'
          ? wonCupPlayer
          : tournamentEndPlayer;

    player.loop = false;
    player.seekTo(0);
    player.play();
    clearSoundEffectRequest(id);
  }, [
    clearSoundEffectRequest,
    eliminatedPlayer,
    soundEffectRequest,
    soundEffectsEnabled,
    tournamentEndPlayer,
    wonCupPlayer,
  ]);

  return children;
}
