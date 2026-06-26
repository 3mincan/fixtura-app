export const GAME_SOUND_ASSETS = {
  mainMenu: require('../../assets/sounds/main-menu.mp3'),
  userMatch: require('../../assets/sounds/user-match.mp3'),
  eliminated: require('../../assets/sounds/eliminated.mp3'),
  wonCup: require('../../assets/sounds/won-cup.mp3'),
  tournamentEnd: require('../../assets/sounds/tournament-end.mp3'),
} as const;

export type GameMusicScene = 'main-menu' | 'user-match' | 'none';

export type GameSoundEffect = 'eliminated' | 'won-cup' | 'tournament-end';
