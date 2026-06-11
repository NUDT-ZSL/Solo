import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  Question,
  Player,
  Room,
  PlayerScore,
  PlayerRanking,
  ChatMessage,
  RoomState,
  ServerQuestionPayload,
  AnswerResultPayload,
  GameOverPayload,
} from '../shared/types.js';
import { quizData } from './quizData.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map<string, Room>();
const roomTimers = new Map<string, NodeJS.Timeout>();
const roomChatMessages = new Map<string, ChatMessage[]>();
const roomQuestions = new Map<string, Question[]>();
const socketToPlayer = new Map<string, { playerId: string; roomId: string }>();
const playerAnswerTimes = new Map<string, number[]>();

const TOTAL_QUESTIONS = 10;
const TIME_LIMIT = 15;
const MAX_PLAYERS = 4;

const EMOTICON_MAP: Record<string, string> = {
  ':)': '😊',
  ':D': '😄',
  ':(': '😢',
  ':P': '😛',
  ';)': '😉',
  '<3': '❤️',
};

function convertEmoticons(text: string): string {
  let result = text;
  for (const [emoticon, emoji] of Object.entries(EMOTICON_MAP)) {
    result = result.split(emoticon).join(emoji);
  }
  return result;
}

function getRoomsList(): Partial<Room>[] {
  const list: Partial<Room>[] = [];
  for (const room of rooms.values()) {
    if (room.status === 'waiting') {
      list.push({
        id: room.id,
        name: room.name,
        players: room.players,
        status: room.status,
        maxPlayers: room.maxPlayers,
      });
    }
  }
  return list;
}

function buildRoomState(roomId: string): RoomState {
  const room = rooms.get(roomId)!;
  const messages = roomChatMessages.get(roomId) || [];
  return {
    room,
    players: room.players,
    currentQuestionIndex: room.currentQuestion,
    timeRemaining: TIME_LIMIT,
    chatMessages: messages,
  };
}

function emitRoomList() {
  io.emit('ROOM_LIST', getRoomsList());
}

function emitRoomState(roomId: string) {
  io.to(roomId).emit('ROOM_STATE', buildRoomState(roomId));
}

function selectQuestions(roomId: string): Question[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  let easyRatio: number;
  let mediumRatio: number;

  const playersWithAnswers = room.players.filter((p) => p.totalAnswered > 0);
  if (playersWithAnswers.length === 0) {
    easyRatio = 0.3;
    mediumRatio = 0.5;
  } else {
    const totalCorrect = playersWithAnswers.reduce((s, p) => s + p.correctCount, 0);
    const totalAnswered = playersWithAnswers.reduce((s, p) => s + p.totalAnswered, 0);
    const accuracy = totalCorrect / totalAnswered;

    if (accuracy > 0.7) {
      easyRatio = 0.2;
      mediumRatio = 0.3;
    } else if (accuracy >= 0.4) {
      easyRatio = 0.3;
      mediumRatio = 0.5;
    } else {
      easyRatio = 0.5;
      mediumRatio = 0.35;
    }
  }

  const easyQuestions = quizData.filter((q) => q.difficulty === 'easy');
  const mediumQuestions = quizData.filter((q) => q.difficulty === 'medium');
  const hardQuestions = quizData.filter((q) => q.difficulty === 'hard');

  const easyCount = Math.round(TOTAL_QUESTIONS * easyRatio);
  const mediumCount = Math.round(TOTAL_QUESTIONS * mediumRatio);
  const hardCount = TOTAL_QUESTIONS - easyCount - mediumCount;

  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const picked: Question[] = [
    ...shuffle(easyQuestions).slice(0, easyCount),
    ...shuffle(mediumQuestions).slice(0, mediumCount),
    ...shuffle(hardQuestions).slice(0, hardCount),
  ];

  return shuffle(picked);
}

function sendQuestion(roomId: string, questionIndex: number) {
  const room = rooms.get(roomId);
  const questions = roomQuestions.get(roomId);
  if (!room || !questions || questionIndex >= questions.length) return;

  room.currentQuestion = questionIndex;

  for (const p of room.players) {
    p.hasAnswered = false;
  }

  const question = questions[questionIndex];
  const { correctIndex, ...questionWithoutAnswer } = question;

  const payload: ServerQuestionPayload = {
    questionIndex,
    question: questionWithoutAnswer as Question,
    timeLimit: TIME_LIMIT,
  };
  io.to(roomId).emit('SERVER_QUESTION', payload);

  const existingTimer = roomTimers.get(roomId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    handleTimeUp(roomId);
  }, TIME_LIMIT * 1000);

  roomTimers.set(roomId, timer);
}

function calculateScores(roomId: string, _questionIndex: number): PlayerScore[] {
  const room = rooms.get(roomId);
  const questions = roomQuestions.get(roomId);
  if (!room || !questions) return [];

  const scores: PlayerScore[] = [];

  for (const player of room.players) {
    const answerRecord = playerAnswerTimes.get(player.id);
    const lastTime = answerRecord ? answerRecord[answerRecord.length - 1] : 0;
    const isCorrect = player.hasAnswered && lastTime >= 0;
    const questionScore = isCorrect ? 100 + Math.abs(lastTime) * 5 : 0;

    scores.push({
      playerId: player.id,
      nickname: player.nickname,
      score: player.score,
      questionScore,
    });
  }

  return scores;
}

function handleTimeUp(roomId: string) {
  const room = rooms.get(roomId);
  const questions = roomQuestions.get(roomId);
  if (!room || !questions) return;

  const questionIndex = room.currentQuestion;
  const question = questions[questionIndex];

  for (const player of room.players) {
    if (!player.hasAnswered) {
      player.hasAnswered = true;
      player.totalAnswered++;
    }
  }

  const scores = calculateScores(roomId, questionIndex);

  io.to(roomId).emit('ANSWER_RESULT', {
    correct: false,
    correctIndex: question.correctIndex,
    scores,
  } as AnswerResultPayload);

  io.to(roomId).emit('SCORE_UPDATE', room.players.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    score: p.score,
    questionScore: 0,
  })));

  roomTimers.delete(roomId);

  setTimeout(() => {
    advanceToNextQuestion(roomId);
  }, 2500);
}

function advanceToNextQuestion(roomId: string) {
  const room = rooms.get(roomId);
  const questions = roomQuestions.get(roomId);
  if (!room || !questions) return;

  const nextIndex = room.currentQuestion + 1;

  if (nextIndex >= questions.length) {
    endGame(roomId);
  } else {
    selectAndSendQuestion(roomId, nextIndex);
  }
}

function selectAndSendQuestion(roomId: string, questionIndex: number) {
  if (questionIndex > 0 && questionIndex < TOTAL_QUESTIONS) {
    const newQuestions = selectQuestions(roomId);
    const existing = roomQuestions.get(roomId)!;
    const kept = existing.slice(0, questionIndex);
    const remaining = newQuestions.filter(
      (q) => !kept.some((kq) => kq.id === q.id),
    );
    roomQuestions.set(roomId, [...kept, ...remaining.slice(0, TOTAL_QUESTIONS - questionIndex)]);
  }
  sendQuestion(roomId, questionIndex);
}

function endGame(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const existingTimer = roomTimers.get(roomId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    roomTimers.delete(roomId);
  }

  room.status = 'waiting';
  room.currentQuestion = 0;

  const rankings: PlayerRanking[] = room.players
    .map((p) => {
      const times = playerAnswerTimes.get(p.id) || [];
      const correctTimes = times.filter((t) => t >= 0);
      const avgTime = correctTimes.length > 0
        ? correctTimes.reduce((s, t) => s + t, 0) / correctTimes.length
        : 0;
      return {
        playerId: p.id,
        nickname: p.nickname,
        totalScore: p.score,
        correctCount: p.correctCount,
        avgTime: Math.round(avgTime * 10) / 10,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  const payload: GameOverPayload = { rankings };
  io.to(roomId).emit('GAME_OVER', payload);

  for (const p of room.players) {
    p.score = 0;
    p.correctCount = 0;
    p.totalAnswered = 0;
    p.hasAnswered = false;
    playerAnswerTimes.delete(p.id);
  }

  roomChatMessages.delete(roomId);
  roomQuestions.delete(roomId);

  emitRoomState(roomId);
  emitRoomList();
}

function removePlayerFromRoom(socketId: string) {
  const mapping = socketToPlayer.get(socketId);
  if (!mapping) return;

  const { playerId, roomId } = mapping;
  const room = rooms.get(roomId);
  if (!room) {
    socketToPlayer.delete(socketId);
    return;
  }

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    const timer = roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      roomTimers.delete(roomId);
    }
    rooms.delete(roomId);
    roomChatMessages.delete(roomId);
    roomQuestions.delete(roomId);
  } else {
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }

    if (room.status === 'playing') {
      const allAnswered = room.players.every((p) => p.hasAnswered);
      if (allAnswered && roomTimers.has(roomId)) {
        const timer = roomTimers.get(roomId)!;
        clearTimeout(timer);
        roomTimers.delete(roomId);

        const questions = roomQuestions.get(roomId);
        if (questions) {
          const question = questions[room.currentQuestion];
          const scores = calculateScores(roomId, room.currentQuestion);

          io.to(roomId).emit('ANSWER_RESULT', {
            correct: false,
            correctIndex: question.correctIndex,
            scores,
          } as AnswerResultPayload);

          io.to(roomId).emit('SCORE_UPDATE', room.players.map((p) => ({
            playerId: p.id,
            nickname: p.nickname,
            score: p.score,
            questionScore: 0,
          })));

          setTimeout(() => {
            advanceToNextQuestion(roomId);
          }, 2500);
        }
      }
    }

    emitRoomState(roomId);
  }

  socketToPlayer.delete(socketId);
  emitRoomList();
}

io.on('connection', (socket) => {
  socket.on('CREATE_ROOM', ({ nickname }: { nickname: string }) => {
    const playerId = uuidv4();
    const roomId = uuidv4();
    const roomName = `${nickname}'s Room`;

    const player: Player = {
      id: playerId,
      nickname,
      score: 0,
      correctCount: 0,
      totalAnswered: 0,
      hasAnswered: false,
    };

    const room: Room = {
      id: roomId,
      name: roomName,
      hostId: playerId,
      players: [player],
      status: 'waiting',
      maxPlayers: MAX_PLAYERS,
      currentQuestion: 0,
      totalQuestions: TOTAL_QUESTIONS,
    };

    rooms.set(roomId, room);
    roomChatMessages.set(roomId, []);
    socketToPlayer.set(socket.id, { playerId, roomId });
    socket.join(roomId);

    emitRoomList();
    socket.emit('ROOM_STATE', buildRoomState(roomId));
  });

  socket.on('JOIN_ROOM', ({ roomId, nickname }: { roomId: string; nickname: string }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('ERROR', { message: 'Room is full' });
      return;
    }
    if (room.status === 'playing') {
      socket.emit('ERROR', { message: 'Game already in progress' });
      return;
    }

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      nickname,
      score: 0,
      correctCount: 0,
      totalAnswered: 0,
      hasAnswered: false,
    };

    room.players.push(player);
    socketToPlayer.set(socket.id, { playerId, roomId });
    socket.join(roomId);

    emitRoomState(roomId);
    emitRoomList();
  });

  socket.on('START_GAME', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }

    const mapping = socketToPlayer.get(socket.id);
    if (!mapping || mapping.roomId !== roomId || room.hostId !== mapping.playerId) {
      socket.emit('ERROR', { message: 'Only the host can start the game' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('ERROR', { message: 'Game already in progress' });
      return;
    }
    if (room.players.length < 2) {
      socket.emit('ERROR', { message: 'At least 2 players required' });
      return;
    }

    room.status = 'playing';
    room.currentQuestion = 0;

    for (const p of room.players) {
      p.score = 0;
      p.correctCount = 0;
      p.totalAnswered = 0;
      p.hasAnswered = false;
      playerAnswerTimes.set(p.id, []);
    }

    const questions = selectQuestions(roomId);
    roomQuestions.set(roomId, questions);

    emitRoomList();
    emitRoomState(roomId);

    sendQuestion(roomId, 0);
  });

  socket.on('ANSWER', ({ roomId, questionIndex, answerIndex, timeRemaining }: {
    roomId: string;
    questionIndex: number;
    answerIndex: number;
    timeRemaining: number;
  }) => {
    const room = rooms.get(roomId);
    const questions = roomQuestions.get(roomId);
    if (!room || !questions) return;
    if (room.currentQuestion !== questionIndex) return;

    const mapping = socketToPlayer.get(socket.id);
    if (!mapping || mapping.roomId !== roomId) return;

    const player = room.players.find((p) => p.id === mapping.playerId);
    if (!player || player.hasAnswered) return;

    player.hasAnswered = true;
    player.totalAnswered++;

    const question = questions[questionIndex];
    const isCorrect = answerIndex === question.correctIndex;

    if (isCorrect) {
      const questionScore = 100 + timeRemaining * 5;
      player.score += questionScore;
      player.correctCount++;
      const times = playerAnswerTimes.get(player.id) || [];
      times.push(timeRemaining);
      playerAnswerTimes.set(player.id, times);
    } else {
      const times = playerAnswerTimes.get(player.id) || [];
      times.push(-1);
      playerAnswerTimes.set(player.id, times);
    }

    const scores = room.players.map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
      questionScore: 0,
    }));

    socket.emit('ANSWER_RESULT', {
      correct: isCorrect,
      correctIndex: question.correctIndex,
      scores,
    } as AnswerResultPayload);

    const allAnswered = room.players.every((p) => p.hasAnswered);
    if (allAnswered) {
      const timer = roomTimers.get(roomId);
      if (timer) {
        clearTimeout(timer);
        roomTimers.delete(roomId);
      }

      io.to(roomId).emit('ANSWER_RESULT', {
        correct: false,
        correctIndex: question.correctIndex,
        scores: room.players.map((p) => ({
          playerId: p.id,
          nickname: p.nickname,
          score: p.score,
          questionScore: 0,
        })),
      } as AnswerResultPayload);

      io.to(roomId).emit('SCORE_UPDATE', room.players.map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        score: p.score,
        questionScore: 0,
      })));

      setTimeout(() => {
        advanceToNextQuestion(roomId);
      }, 2500);
    }
  });

  socket.on('CHAT_MESSAGE', ({ roomId, message }: { roomId: string; message: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const mapping = socketToPlayer.get(socket.id);
    if (!mapping || mapping.roomId !== roomId) return;

    const player = room.players.find((p) => p.id === mapping.playerId);
    if (!player) return;

    const chatMsg: ChatMessage = {
      nickname: player.nickname,
      message: convertEmoticons(message),
      timestamp: Date.now(),
    };

    const messages = roomChatMessages.get(roomId) || [];
    messages.push(chatMsg);
    roomChatMessages.set(roomId, messages);

    io.to(roomId).emit('CHAT_MESSAGE', chatMsg);
  });

  socket.on('LEAVE_ROOM', ({ roomId }: { roomId: string }) => {
    const mapping = socketToPlayer.get(socket.id);
    if (!mapping || mapping.roomId !== roomId) return;

    socket.leave(roomId);
    removePlayerFromRoom(socket.id);
  });

  socket.on('disconnect', () => {
    removePlayerFromRoom(socket.id);
  });
});

function getRooms() {
  return getRoomsList();
}

const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`QuizArena server running on port ${PORT}`);
});

export { io, getRooms };
