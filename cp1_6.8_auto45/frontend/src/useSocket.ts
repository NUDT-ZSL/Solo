import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState, AnswerResult, LikeUpdate } from './types';

interface UseSocketOptions {
  roomCode: string;
  playerName: string;
  onRoomUpdate?: (room: RoomState) => void;
  onGameStarted?: (room: RoomState) => void;
  onAnswerResult?: (result: AnswerResult) => void;
  onLikeUpdate?: (update: LikeUpdate) => void;
  onTimerUpdate?: (timeLeft: number) => void;
  onGameOver?: (room: RoomState) => void;
  onError?: (message: string) => void;
}

export function useSocket(opts: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', {
        roomCode: optsRef.current.roomCode,
        playerName: optsRef.current.playerName,
      });
    });

    socket.on('room_update', (data: RoomState) => {
      optsRef.current.onRoomUpdate?.(data);
    });

    socket.on('game_started', (data: RoomState) => {
      optsRef.current.onGameStarted?.(data);
    });

    socket.on('answer_result', (data: AnswerResult) => {
      optsRef.current.onAnswerResult?.(data);
    });

    socket.on('like_update', (data: LikeUpdate) => {
      optsRef.current.onLikeUpdate?.(data);
    });

    socket.on('timer_update', (data: { timeLeft: number }) => {
      optsRef.current.onTimerUpdate?.(data.timeLeft);
    });

    socket.on('game_over', (data: RoomState) => {
      optsRef.current.onGameOver?.(data);
    });

    socket.on('error', (data: { message: string }) => {
      optsRef.current.onError?.(data.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game', {
      roomCode: opts.roomCode,
    });
  }, [opts.roomCode]);

  const submitAnswer = useCallback(
    (riddleId: number, answer: string) => {
      socketRef.current?.emit('submit_answer', {
        roomCode: opts.roomCode,
        riddleId,
        answer,
        playerName: opts.playerName,
      });
    },
    [opts.roomCode, opts.playerName]
  );

  const likeRiddle = useCallback(
    (riddleId: number) => {
      socketRef.current?.emit('like_riddle', {
        roomCode: opts.roomCode,
        riddleId,
        playerName: opts.playerName,
      });
    },
    [opts.roomCode, opts.playerName]
  );

  const sendTick = useCallback(() => {
    socketRef.current?.emit('tick', {
      roomCode: opts.roomCode,
    });
  }, [opts.roomCode]);

  return { startGame, submitAnswer, likeRiddle, sendTick };
}
