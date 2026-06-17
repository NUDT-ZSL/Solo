import { create } from 'zustand';
import { CooldownState, ComboRecord } from '../game/gameEngine';

interface GameState {
  cooldowns: CooldownState;
  comboRecords: ComboRecord[];
  setCooldowns: (cooldowns: CooldownState) => void;
  addComboRecord: (record: ComboRecord) => void;
}

export const useGameStore = create<GameState>((set) => ({
  cooldowns: {
    light: 0,
    heavy: 0,
    special: 0,
  },
  comboRecords: [],
  setCooldowns: (cooldowns) => set({ cooldowns }),
  addComboRecord: (record) =>
    set((state) => ({
      comboRecords: [...state.comboRecords, record],
    })),
}));
