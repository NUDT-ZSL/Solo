import type { Socket } from 'socket.io-client';
import type {
  RoomState,
  ServerQuestionPayload,
  AnswerResultPayload,
  GameOverPayload,
  ChatMessage,
} from '../../../shared/types.js';

interface GameBoardProps {
  socket: Socket;
  roomState: RoomState | null;
  currentQuestion: ServerQuestionPayload | null;
  answerResult: AnswerResultPayload | null;
  gameOver: GameOverPayload | null;
  chatMessages: ChatMessage[];
  selectedAnswer: number | null;
  hasAnswered: boolean;
  nickname: string;
  onAnswer: (questionIndex: number, answerIndex: number, timeRemaining: number) => void;
  onLeave: () => void;
}

export default function GameBoard(_props: GameBoardProps) {
  return null;
}
