import { create } from 'zustand';
import type {
  RoomState,
  ServerQuestionPayload,
  AnswerResultPayload,
  GameOverPayload,
  ChatMessage,
  RoomListItem,
} from '../../../shared/types.js';

interface GameState {
  nickname: string;
  roomId: string | null;
  roomState: RoomState | null;
  currentQuestion: ServerQuestionPayload | null;
  answerResult: AnswerResultPayload | null;
  gameOver: GameOverPayload | null;
  chatMessages: ChatMessage[];
  rooms: RoomListItem[];
  isConnected: boolean;
  selectedAnswer: number | null;
  hasAnswered: boolean;
}

interface GameActions {
  setNickname: (nickname: string) => void;
  setRoomId: (roomId: string | null) => void;
  setRoomState: (roomState: RoomState) => void;
  setCurrentQuestion: (q: ServerQuestionPayload) => void;
  setAnswerResult: (r: AnswerResultPayload) => void;
  setGameOver: (g: GameOverPayload) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setRooms: (rooms: RoomListItem[]) => void;
  setConnected: (connected: boolean) => void;
  setSelectedAnswer: (idx: number | null) => void;
  setHasAnswered: (answered: boolean) => void;
  resetGame: () => void;
}

type GameStore = GameState & GameActions;

const initialState: GameState = {
  nickname: '',
  roomId: null,
  roomState: null,
  currentQuestion: null,
  answerResult: null,
  gameOver: null,
  chatMessages: [],
  rooms: [],
  isConnected: false,
  selectedAnswer: null,
  hasAnswered: false,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setNickname: (nickname) => set({ nickname }),
  setRoomId: (roomId) => set({ roomId }),
  setRoomState: (roomState) => set({ roomState }),
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setAnswerResult: (r) => set({ answerResult: r }),
  setGameOver: (g) => set({ gameOver: g }),
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  setRooms: (rooms) => set({ rooms }),
  setConnected: (connected) => set({ isConnected: connected }),
  setSelectedAnswer: (idx) => set({ selectedAnswer: idx }),
  setHasAnswered: (answered) => set({ hasAnswered: answered }),
  resetGame: () =>
    set({
      currentQuestion: null,
      answerResult: null,
      gameOver: null,
      selectedAnswer: null,
      hasAnswered: false,
    }),
}));
