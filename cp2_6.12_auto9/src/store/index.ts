export interface VoteOption {
  id: string;
  text: string;
  count: number;
}

export interface Vote {
  id: string;
  title: string;
  options: VoteOption[];
  type: 'single' | 'multiple';
  duration: number;
  startTime: number;
  active: boolean;
}

export interface BarrageMessage {
  id: string;
  text: string;
  color: string;
  timestamp: number;
}

interface ActivityState {
  currentVote: Vote | null;
  voteEnded: boolean;
  winnerId: string | null;
  barrageMessages: BarrageMessage[];
  emojiRainType: string | null;
  isHost: boolean;
  setCurrentVote: (vote: Vote | null) => void;
  updateVoteOptions: (options: VoteOption[]) => void;
  endVote: (winnerId: string | null) => void;
  addBarrage: (msg: BarrageMessage) => void;
  setEmojiRain: (type: string) => void;
  resetEmojiRain: () => void;
}

const urlParams = new URLSearchParams(window.location.search);
const isHost = urlParams.get('host') === 'true';

import { create } from 'zustand';

const useActivityStore = create<ActivityState>((set) => ({
  currentVote: null,
  voteEnded: false,
  winnerId: null,
  barrageMessages: [],
  emojiRainType: null,
  isHost,
  setCurrentVote: (vote) => set({ currentVote: vote, voteEnded: false, winnerId: null }),
  updateVoteOptions: (options) =>
    set((state) => ({
      currentVote: state.currentVote ? { ...state.currentVote, options } : null,
    })),
  endVote: (winnerId) => set({ voteEnded: true, winnerId }),
  addBarrage: (msg) =>
    set((state) => ({
      barrageMessages: [...state.barrageMessages, msg].slice(-60),
    })),
  setEmojiRain: (type) => set({ emojiRainType: type }),
  resetEmojiRain: () => set({ emojiRainType: null }),
}));

export default useActivityStore;
