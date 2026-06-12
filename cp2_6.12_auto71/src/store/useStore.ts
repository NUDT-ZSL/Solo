import { create } from 'zustand';
import { CurrentUser } from '../types';

interface AppState {
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: {
    id: 'current-user-1',
    name: '爱读书的你',
    avatar: '📖',
    avatarBorder: '#8B5CF6'
  },
  setCurrentUser: (user) => set({ currentUser: user })
}));
