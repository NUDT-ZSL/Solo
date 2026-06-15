import { create } from 'zustand';
import type { User, Skill } from './api';
import { getSavedUser, logout as apiLogout, getToken } from './api';

interface AppState {
  user: User | null;
  skills: Skill[];
  skillsLoading: boolean;
  setUser: (u: User | null) => void;
  setSkills: (skills: Skill[]) => void;
  setSkillsLoading: (loading: boolean) => void;
  logout: () => void;
  getToken: () => string | null;
}

export const useAppStore = create<AppState>((set) => ({
  user: getSavedUser(),
  skills: [],
  skillsLoading: false,
  setUser: (u) => {
    if (u) localStorage.setItem('skillswap_user', JSON.stringify(u));
    set({ user: u });
  },
  setSkills: (skills) => set({ skills }),
  setSkillsLoading: (loading) => set({ skillsLoading: loading }),
  logout: () => {
    apiLogout();
    set({ user: null });
  },
  getToken,
}));
