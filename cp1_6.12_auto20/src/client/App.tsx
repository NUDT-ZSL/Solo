import { useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from './stores/gameStore';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import type {
  RoomState,
  ServerQuestionPayload,
  AnswerResultPayload,
  GameOverPayload,
  ChatMessage,
  Room,
  PlayerScore,
} from '../../shared/types.js';

function AppContent() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const nickname = useGameStore((s) => s.nickname);
  const roomState = useGameStore((s) => s.roomState);
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const answerResult = useGameStore((s) => s.answerResult);
  const gameOver = useGameStore((s) => s.gameOver);
  const chatMessages = useGameStore((s) => s.chatMessages);
  const rooms = useGameStore((s) => s.rooms);
  const isConnected = useGameStore((s) => s.isConnected);
  const selectedAnswer = useGameStore((s) => s.selectedAnswer);
  const hasAnswered = useGameStore((s) => s.hasAnswered);

  const setRoomId = useGameStore((s) => s.setRoomId);
  const setRoomState = useGameStore((s) => s.setRoomState);
  const setCurrentQuestion = useGameStore((s) => s.setCurrentQuestion);
  const setAnswerResult = useGameStore((s) => s.setAnswerResult);
  const setGameOver = useGameStore((s) => s.setGameOver);
  const addChatMessage = useGameStore((s) => s.addChatMessage);
  const setRooms = useGameStore((s) => s.setRooms);
  const setConnected = useGameStore((s) => s.setConnected);
  const setSelectedAnswer = useGameStore((s) => s.setSelectedAnswer);
  const setHasAnswered = useGameStore((s) => s.setHasAnswered);

  useEffect(() => {
    const socket: Socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('ROOM_LIST', (data: Room[]) => setRooms(data));
    socket.on('ROOM_STATE', (data: RoomState) => {
      setRoomState(data);
      if (!useGameStore.getState().roomId) {
        setRoomId(data.room.id);
      }
    });
    socket.on('SERVER_QUESTION', (data: ServerQuestionPayload) => {
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setHasAnswered(false);
    });
    socket.on('ANSWER_RESULT', (data: AnswerResultPayload) => setAnswerResult(data));
    socket.on('SCORE_UPDATE', (scores: PlayerScore[]) => {
      const prev = useGameStore.getState().roomState;
      if (!prev) return;
      setRoomState({
        ...prev,
        players: prev.players.map((p) => {
          const scoreEntry = scores.find((s) => s.playerId === p.id);
          return scoreEntry ? { ...p, score: scoreEntry.score } : p;
        }),
      });
    });
    socket.on('GAME_OVER', (data: GameOverPayload) => setGameOver(data));
    socket.on('CHAT_MESSAGE', (data: ChatMessage) => addChatMessage(data));
    socket.on('ERROR', (data: { message: string }) => console.error(data.message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleAnswer = useCallback(
    (questionIndex: number, answerIndex: number, timeRemaining: number) => {
      socketRef.current?.emit('ANSWER', {
        roomId: useGameStore.getState().roomId,
        questionIndex,
        answerIndex,
        timeRemaining,
      });
      setSelectedAnswer(answerIndex);
      setHasAnswered(true);
    },
    [],
  );

  const handleLeave = useCallback(() => {
    const currentRoomId = useGameStore.getState().roomId;
    socketRef.current?.emit('LEAVE_ROOM', { roomId: currentRoomId });
    navigate('/');
  }, [navigate]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Lobby
            socket={socketRef.current!}
            rooms={rooms}
            nickname={nickname}
            roomState={roomState}
            chatMessages={chatMessages}
            isConnected={isConnected}
          />
        }
      />
      <Route
        path="/game/:roomId"
        element={
          <GameBoard
            socket={socketRef.current!}
            roomState={roomState}
            currentQuestion={currentQuestion}
            answerResult={answerResult}
            gameOver={gameOver}
            chatMessages={chatMessages}
            selectedAnswer={selectedAnswer}
            hasAnswered={hasAnswered}
            nickname={nickname}
            onAnswer={handleAnswer}
            onLeave={handleLeave}
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
