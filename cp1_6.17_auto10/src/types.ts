export interface PetStats {
  health: number;
  hunger: number;
  happiness: number;
  cleanliness: number;
}

export enum PetAction {
  FEED = 'feed',
  PLAY = 'play',
  CLEAN = 'clean',
  MEDICINE = 'medicine',
}

export interface FloatingText {
  id: number;
  value: number;
  type: keyof PetStats;
}
