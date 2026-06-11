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
  RoomListItem,
  PlayerScore,
} from '../../shared/types.js';

function AppContent() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const hasConnectedRef = useRef(false);

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

  useEffect(() => {
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;

    const socket: Socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => useGameStore.getState().setConnected(true));
    socket.on('disconnect', () => useGameStore.getState().setConnected(false));

    socket.on('ROOM_LIST', (data: RoomListItem[]) => {
      useGameStore.getState().setRooms(data);
    });

    socket.on('ROOM_STATE', (data: RoomState) => {
      const store = useGameStore.getState();
      store.setRoomState(data);
      if (!store.roomId) {
        store.setRoomId(data.room.id);
      }
    });

    socket.on('SERVER_QUESTION', (data: ServerQuestionPayload) => {
      const store = useGameStore.getState();
      store.setCurrentQuestion(data);
      store.setSelectedAnswer(null);
      store.setHasAnswered(false);
    });

    socket.on('ANSWER_RESULT', (data: AnswerResultPayload) => {
      useGameStore.getState().setAnswerResult(data);
    });

    socket.on('SCORE_UPDATE', (scores: PlayerScore[]) => {
      const prev = useGameStore.getState().roomState;
      if (!prev) return;
      useGameStore.getState().setRoomState({
        ...prev,
        players: prev.players.map((p) => {
          const scoreEntry = scores.find((s) => s.playerId === p.id);
          return scoreEntry ? { ...p, score: scoreEntry.score } : p;
        }),
      });
    });

    socket.on('GAME_OVER', (data: GameOverPayload) => {
      useGameStore.getState().setGameOver(data);
    });

    socket.on('CHAT_MESSAGE', (data: ChatMessage) => {
      useGameStore.getState().addChatMessage(data);
    });

    socket.on('ERROR', (data: { message: string }) => {
      console.error('Socket error:', data.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      hasConnectedRef.current = false;
    };
  }, []);

  const handleAnswer = useCallback(
    (questionIndex: number, answerIndex: number, timeRemaining: number) => {
      const store = useGameStore.getState();
      socketRef.current?.emit('ANSWER', {
        roomId: store.roomId,
        questionIndex,
        answerIndex,
        timeRemaining,
      });
      store.setSelectedAnswer(answerIndex);
      store.setHasAnswered(true);
    },
    [],
  );

  const handleLeave = useCallback(() => {
    const currentRoomId = useGameStore.getState().roomId;
    socketRef.current?.emit('LEAVE_ROOM', { roomId: currentRoomId });
    useGameStore.getState().resetGame();
    useGameStore.getState().setRoomId(null);
    useGameStore.getState().setRoomState(null as unknown as RoomState);
    navigate('/');
  }, [navigate]);

  const handleStartGame = useCallback(() => {
    socketRef.current?.emit('START_GAME');
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Lobby
            socket={socketRef.current}
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
            socket={socketRef.current}
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
            onStartGame={handleStartGame}
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
