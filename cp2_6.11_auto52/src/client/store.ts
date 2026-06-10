import { create } from 'zustand';
import type { FilmRoll } from './types';
import { getRolls, getRoll } from './api';

interface FilmRollState {
  filmrolls: FilmRoll[];
  currentRoll: FilmRoll | null;
  fetchAll: () => Promise<void>;
  fetchOne: (id: string) => Promise<FilmRoll | null>;
  setRolls: (rolls: FilmRoll[]) => void;
  updateRoll: (id: string, data: Partial<FilmRoll>) => void;
}

export const useFilmRollStore = create<FilmRollState>((set, get) => ({
  filmrolls: [],
  currentRoll: null,

  fetchAll: async () => {
    const rolls = await getRolls();
    set({ filmrolls: rolls });
  },

  fetchOne: async (id: string) => {
    const existing = get().filmrolls.find(r => r.id === id);
    if (existing) {
      set({ currentRoll: existing });
      return existing;
    }
    const roll = await getRoll(id);
    set(state => ({
      currentRoll: roll,
      filmrolls: state.filmrolls.some(r => r.id === roll.id)
        ? state.filmrolls.map(r => r.id === roll.id ? roll : r)
        : [...state.filmrolls, roll],
    }));
    return roll;
  },

  setRolls: (rolls: FilmRoll[]) => {
    set({ filmrolls: rolls });
  },

  updateRoll: (id: string, data: Partial<FilmRoll>) => {
    set(state => ({
      filmrolls: state.filmrolls.map(r =>
        r.id === id ? { ...r, ...data } : r
      ),
      currentRoll:
        state.currentRoll?.id === id
          ? { ...state.currentRoll, ...data }
          : state.currentRoll,
    }));
  },
}));
