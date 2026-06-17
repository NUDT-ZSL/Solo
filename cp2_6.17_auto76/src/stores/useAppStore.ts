import { create } from 'zustand';
import { Member, ScoreRecord } from '@/utils/dataHelper';

interface AppState {
  members: Member[];
  scores: ScoreRecord[];
  selectedMember: Member | null;
  scorePanelOpen: boolean;
  loading: boolean;

  setMembers: (members: Member[]) => void;
  setScores: (scores: ScoreRecord[]) => void;
  setSelectedMember: (member: Member | null) => void;
  setScorePanelOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  addScore: (score: ScoreRecord) => void;
  addMember: (member: Member) => void;
}

export const useAppStore = create<AppState>((set) => ({
  members: [],
  scores: [],
  selectedMember: null,
  scorePanelOpen: false,
  loading: false,

  setMembers: (members) => set({ members }),
  setScores: (scores) => set({ scores }),
  setSelectedMember: (member) => set({ selectedMember: member, scorePanelOpen: member !== null }),
  setScorePanelOpen: (open) => set({ scorePanelOpen: open }),
  setLoading: (loading) => set({ loading }),
  addScore: (score) => set((state) => ({ scores: [...state.scores, score] })),
  addMember: (member) => set((state) => ({ members: [...state.members, member] })),
}));
