export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface Player {
  id: string;
  nickname: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
  hasAnswered: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  status: "waiting" | "playing";
  maxPlayers: number;
  currentQuestion: number;
  totalQuestions: number;
}

export interface PlayerScore {
  playerId: string;
  nickname: string;
  score: number;
  questionScore: number;
}

export interface PlayerRanking {
  playerId: string;
  nickname: string;
  totalScore: number;
  correctCount: number;
  avgTime: number;
}

export interface ChatMessage {
  nickname: string;
  message: string;
  timestamp: number;
}

export interface RoomState {
  room: Room;
  players: Player[];
  currentQuestionIndex: number;
  timeRemaining: number;
  chatMessages: ChatMessage[];
}

export interface ServerQuestionPayload {
  questionIndex: number;
  question: Question;
  timeLimit: number;
}

export interface AnswerResultPayload {
  correct: boolean;
  correctIndex: number;
  scores: PlayerScore[];
}

export interface GameOverPayload {
  rankings: PlayerRanking[];
}

export interface ErrorPayload {
  message: string;
}
