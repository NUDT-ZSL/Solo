import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
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
} from '../../shared/types.js';
import quizData from './quizData.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const rooms = new Map<string, Room>();
const roomTimers = new Map<string, NodeJS.Timeout>();
const roomChatMessages = new Map<string, ChatMessage[]>();
const roomQuestions = new Map<string, Question[]>();
const socketToPlayer = new Map<string, { playerId: string; roomId: string }>();
const playerAnswerTimes = new Map<string, number[]>();

const TOTAL_QUESTIONS = 10;
const TIME_LIMIT = 15;
const MAX_PLAYERS = 4;

const emoticonMap = new Map<string, string>([
  [':)', '😊'],
  [':D', '😄'],
  [':(', '😢'],
  [':P', '😛'],
  [';)', '😉'],
  ['<3', '❤️'],
]);

function convertEmoticons(text: string): string {
  let result = text;
  emoticonMap.forEach((emoji, emoticon) => {
    result = result.split(emoticon).join(emoji);
  });
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRoomsList() {
  const list: Array<{ id: string; name: string; players: number; status: string; maxPlayers: number }> = [];
  rooms.forEach((room) => {
    if (room.status === 'waiting') {
      list.push({
        id: room.id,
        name: room.name,
        players: room.players.length,
        status: room.status,
        maxPlayers: room.maxPlayers,
      });
    }
  });
  return list;
}

function buildRoomState(roomId: string): RoomState | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    room,
    players: room.players,
    currentQuestionIndex: room.currentQuestion,
    timeRemaining: TIME_LIMIT,
    chatMessages: roomChatMessages.get(roomId) || [],
  };
}

function emitRoomList() {
  io.emit('ROOM_LIST', getRoomsList());
}

function emitRoomState(roomId: string) {
  const state = buildRoomState(roomId);
  if (state) {
    io.to(roomId).emit('ROOM_STATE', state);
  }
}

function selectQuestions(roomId: string): Question[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  const easy = quizData.filter(q => q.difficulty === 'easy');
  const medium = quizData.filter(q => q.difficulty === 'medium');
  const hard = quizData.filter(q => q.difficulty === 'hard');

  let easyCount: number;
  let mediumCount: number;
  let hardCount: number;

  const allTimes: number[] = [];
  room.players.forEach(player => {
    const times = playerAnswerTimes.get(player.id);
    if (times && times.length > 0) {
      allTimes.push(...times);
    }
  });

  if (allTimes.length === 0) {
    easyCount = Math.round(TOTAL_QUESTIONS * 0.3);
    mediumCount = Math.round(TOTAL_QUESTIONS * 0.5);
    hardCount = TOTAL_QUESTIONS - easyCount - mediumCount;
  } else {
    const correctCount = allTimes.filter(t => t >= 0).length;
    const accuracy = (correctCount / allTimes.length) * 100;

    if (accuracy > 70) {
      easyCount = Math.round(TOTAL_QUESTIONS * 0.2);
      mediumCount = Math.round(TOTAL_QUESTIONS * 0.3);
      hardCount = TOTAL_QUESTIONS - easyCount - mediumCount;
    } else if (accuracy >= 40) {
      easyCount = Math.round(TOTAL_QUESTIONS * 0.3);
      mediumCount = Math.round(TOTAL_QUESTIONS * 0.5);
      hardCount = TOTAL_QUESTIONS - easyCount - mediumCount;
    } else {
      easyCount = Math.round(TOTAL_QUESTIONS * 0.5);
      mediumCount = Math.round(TOTAL_QUESTIONS * 0.35);
      hardCount = TOTAL_QUESTIONS - easyCount - mediumCount;
    }
  }

  const selected = [
    ...shuffle(easy).slice(0, easyCount),
    ...shuffle(medium).slice(0, mediumCount),
    ...shuffle(hard).slice(0, hardCount),
  ];

  return shuffle(selected);
}

function sendQuestion(roomId: string, questionIndex: number) {
  const room = rooms.get(roomId);
  const questions = roomQuestions.get(roomId);
  if (!room || !questions || questionIndex >= questions.length) return;

  room.players.forEach(p => { p.hasAnswered = false; });

  const question = questions[questionIndex];
  const payload: ServerQuestionPayload = {
    questionIndex,
    question: { ...question, correctIndex: -1 },
    timeLimit: TIME_LIMIT,
  };

  io.to(roomId).emit('SERVER_QUESTION', payload);

  const timer = setTimeout(() => {
    handleTimeUp(roomId);
  }, TIME_LIMIT * 1000);

  roomTimers.set(roomId, timer);
}

function calculateScores(roomId: string, questionIndex: number): PlayerScore[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  return room.players.map(player => {
    const times = playerAnswerTimes.get(player.id) || [];
    const answerTime = times[questionIndex];
    let questionScore = 0;
    if (answerTime !== undefined && answerTime >= 0) {
      questionScore = 100 + answerTime * 5;
    }

    return {
      playerId: player.id,
      nickname: player.nickname,
      score: player.score,
      questionScore,
    };
  });
}

function handleTimeUp(roomId: string) {
  const room = rooms.get(roomId);
  const questions = roomQuestions.get(roomId);
  if (!room || !questions) return;

  room.players.forEach(player => {
    if (!player.hasAnswered) {
      const times = playerAnswerTimes.get(player.id) || [];
      times[room.currentQuestion] = -1;
      playerAnswerTimes.set(player.id, times);
    }
  });

  const scores = calculateScores(roomId, room.currentQuestion);
  const correctIndex = questions[room.currentQuestion].correctIndex;

  io.to(roomId).emit('ANSWER_RESULT', {
    correct: false,
    correctIndex,
    scores,
  } as AnswerResultPayload);

  io.to(roomId).emit('SCORE_UPDATE', scores);

  setTimeout(() => {
    advanceToNextQuestion(roomId);
  }, 2500);
}

function advanceToNextQuestion(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const nextIndex = room.currentQuestion + 1;
  if (nextIndex >= room.totalQuestions) {
    endGame(roomId);
  } else {
    room.currentQuestion = nextIndex;
    sendQuestion(roomId, nextIndex);
  }
}

function endGame(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }

  const rankings: PlayerRanking[] = room.players
    .map(player => {
      const correctTimes = (playerAnswerTimes.get(player.id) || []).filter(t => t >= 0);
      const avgTime = correctTimes.length > 0
        ? correctTimes.reduce((sum, t) => sum + t, 0) / correctTimes.length
        : 0;
      return {
        playerId: player.id,
        nickname: player.nickname,
        totalScore: player.score,
        correctCount: player.correctCount,
        avgTime,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  io.to(roomId).emit('GAME_OVER', { rankings } as GameOverPayload);

  room.status = 'waiting';
  room.currentQuestion = 0;
  room.players.forEach(player => {
    player.score = 0;
    player.correctCount = 0;
    player.totalAnswered = 0;
    player.hasAnswered = false;
  });

  roomQuestions.delete(roomId);
  roomChatMessages.set(roomId, []);
  room.players.forEach(player => {
    playerAnswerTimes.delete(player.id);
  });

  emitRoomState(roomId);
  emitRoomList();
}

function removePlayerFromRoom(socketId: string) {
  const info = socketToPlayer.get(socketId);
  if (!info) return;

  const room = rooms.get(info.roomId);
  socketToPlayer.delete(socketId);

  if (!room) return;

  room.players = room.players.filter(p => p.id !== info.playerId);
  playerAnswerTimes.delete(info.playerId);

  if (room.players.length === 0) {
    const timer = roomTimers.get(info.roomId);
    if (timer) clearTimeout(timer);
    rooms.delete(info.roomId);
    roomTimers.delete(info.roomId);
    roomChatMessages.delete(info.roomId);
    roomQuestions.delete(info.roomId);
  } else {
    if (room.hostId === info.playerId) {
      room.hostId = room.players[0].id;
    }

    if (room.status === 'playing') {
      const allAnswered = room.players.every(p => p.hasAnswered);
      if (allAnswered) {
        const timer = roomTimers.get(info.roomId);
        if (timer) {
          clearTimeout(timer);
          roomTimers.delete(info.roomId);
        }
        const scores = calculateScores(info.roomId, room.currentQuestion);
        const questions = roomQuestions.get(info.roomId);
        if (questions) {
          io.to(info.roomId).emit('ANSWER_RESULT', {
            correct: false,
            correctIndex: questions[room.currentQuestion].correctIndex,
            scores,
          } as AnswerResultPayload);
          io.to(info.roomId).emit('SCORE_UPDATE', scores);
          setTimeout(() => {
            advanceToNextQuestion(info.roomId);
          }, 2500);
        }
      }
    }

    emitRoomState(info.roomId);
  }

  emitRoomList();
}

io.on('connection', (socket) => {
  socket.on('CREATE_ROOM', (data: { nickname: string; roomName: string }) => {
    const roomId = uuidv4();
    const player: Player = {
      id: uuidv4(),
      nickname: data.nickname,
      score: 0,
      correctCount: 0,
      totalAnswered: 0,
      hasAnswered: false,
    };

    const room: Room = {
      id: roomId,
      name: data.roomName,
      hostId: player.id,
      players: [player],
      status: 'waiting',
      maxPlayers: MAX_PLAYERS,
      currentQuestion: 0,
      totalQuestions: TOTAL_QUESTIONS,
    };

    rooms.set(roomId, room);
    roomChatMessages.set(roomId, []);
    socketToPlayer.set(socket.id, { playerId: player.id, roomId });
    socket.join(roomId);

    emitRoomState(roomId);
    emitRoomList();
  });

  socket.on('JOIN_ROOM', (data: { roomId: string; nickname: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('ERROR', { message: 'Room is full' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('ERROR', { message: 'Game already in progress' });
      return;
    }

    const player: Player = {
      id: uuidv4(),
      nickname: data.nickname,
      score: 0,
      correctCount: 0,
      totalAnswered: 0,
      hasAnswered: false,
    };

    room.players.push(player);
    socketToPlayer.set(socket.id, { playerId: player.id, roomId: data.roomId });
    socket.join(data.roomId);

    emitRoomState(data.roomId);
    emitRoomList();
  });

  socket.on('START_GAME', () => {
    const info = socketToPlayer.get(socket.id);
    if (!info) return;

    const room = rooms.get(info.roomId);
    if (!room) return;
    if (room.hostId !== info.playerId) return;
    if (room.status !== 'waiting') return;
    if (room.players.length < 2) return;

    room.status = 'playing';
    room.currentQuestion = 0;

    const questions = selectQuestions(info.roomId);
    roomQuestions.set(info.roomId, questions);

    room.players.forEach(player => {
      player.score = 0;
      player.correctCount = 0;
      player.totalAnswered = 0;
      player.hasAnswered = false;
      playerAnswerTimes.set(player.id, []);
    });

    emitRoomState(info.roomId);
    emitRoomList();

    sendQuestion(info.roomId, 0);
  });

  socket.on('ANSWER', (data: { questionIndex: number; answerIndex: number; timeRemaining: number }) => {
    const info = socketToPlayer.get(socket.id);
    if (!info) return;

    const room = rooms.get(info.roomId);
    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.id === info.playerId);
    if (!player || player.hasAnswered) return;

    const questions = roomQuestions.get(info.roomId);
    if (!questions) return;

    const currentQuestion = questions[room.currentQuestion];
    const correct = data.answerIndex === currentQuestion.correctIndex;

    player.hasAnswered = true;
    player.totalAnswered++;

    const times = playerAnswerTimes.get(player.id) || [];
    if (correct) {
      player.correctCount++;
      const questionScore = 100 + data.timeRemaining * 5;
      player.score += questionScore;
      times[data.questionIndex] = data.timeRemaining;
    } else {
      times[data.questionIndex] = -1;
    }
    playerAnswerTimes.set(player.id, times);

    const scores = calculateScores(info.roomId, room.currentQuestion);

    socket.emit('ANSWER_RESULT', {
      correct,
      correctIndex: currentQuestion.correctIndex,
      scores,
    } as AnswerResultPayload);

    const allAnswered = room.players.every(p => p.hasAnswered);
    if (allAnswered) {
      const timer = roomTimers.get(info.roomId);
      if (timer) {
        clearTimeout(timer);
        roomTimers.delete(info.roomId);
      }

      io.to(info.roomId).emit('ANSWER_RESULT', {
        correct: false,
        correctIndex: currentQuestion.correctIndex,
        scores,
      } as AnswerResultPayload);

      io.to(info.roomId).emit('SCORE_UPDATE', scores);

      setTimeout(() => {
        advanceToNextQuestion(info.roomId);
      }, 2500);
    }
  });

  socket.on('CHAT_MESSAGE', (data: { message: string }) => {
    const info = socketToPlayer.get(socket.id);
    if (!info) return;

    const room = rooms.get(info.roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === info.playerId);
    if (!player) return;

    const chatMessage: ChatMessage = {
      nickname: player.nickname,
      message: convertEmoticons(data.message),
      timestamp: Date.now(),
    };

    const messages = roomChatMessages.get(info.roomId) || [];
    messages.push(chatMessage);
    roomChatMessages.set(info.roomId, messages);

    io.to(info.roomId).emit('CHAT_MESSAGE', chatMessage);
  });

  socket.on('LEAVE_ROOM', () => {
    const info = socketToPlayer.get(socket.id);
    if (!info) return;

    socket.leave(info.roomId);
    removePlayerFromRoom(socket.id);
  });

  socket.on('disconnect', () => {
    removePlayerFromRoom(socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`QuizArena server running on port ${PORT}`);
});
