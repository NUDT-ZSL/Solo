import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { getRandomQuestions, QuestionData } from './questions';

interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isAnswered: boolean;
  lastAnswerCorrect: boolean | null;
  roomCode: string;
}

interface Room {
  code: string;
  name: string;
  category: string;
  questionCount: number;
  timeLimit: number;
  hostId: string;
  phase: 'waiting' | 'playing' | 'intermission' | 'ended';
  players: Map<string, Player>;
  questions: QuestionData[];
  currentQuestion: number;
  timers: {
    question?: NodeJS.Timeout;
    intermission?: NodeJS.Timeout;
  };
  intermissionCount: number;
}

type Category = 'tech' | 'history' | 'entertainment';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, players: playerRoomMap.size });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const rooms = new Map<string, Room>();
const playerRoomMap = new Map<string, string>();

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += INVITE_CHARS.charAt(Math.floor(Math.random() * INVITE_CHARS.length));
    }
    if (!rooms.has(code)) return code;
  }
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calculateScore(isCorrect: boolean, timeSpent: number, timeLimit: number): number {
  if (!isCorrect) return 0;
  const remainingRatio = Math.max(0, 1 - timeSpent / timeLimit);
  const base = 100;
  const speedBonus = Math.round(50 * remainingRatio);
  return base + speedBonus;
}

function getPlayersArray(room: Room): Player[] {
  return Array.from(room.players.values());
}

function getRanking(room: Room) {
  const sorted = getPlayersArray(room).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
  let rank = 0;
  let lastScore = -1;
  return sorted.map((p, idx) => {
    if (p.score !== lastScore) {
      rank = idx + 1;
      lastScore = p.score;
    }
    return {
      playerId: p.id,
      playerName: p.name,
      avatar: p.avatar,
      score: p.score,
      rank,
    };
  });
}

function getScores(room: Room): { [id: string]: number } {
  const scores: { [id: string]: number } = {};
  room.players.forEach((p) => {
    scores[p.id] = p.score;
  });
  return scores;
}

function broadcastScoreUpdate(room: Room) {
  io.to(room.code).emit('score-update', {
    scores: getScores(room),
    ranking: getRanking(room),
  });
}

function clearRoomTimers(room: Room) {
  if (room.timers.question) {
    clearTimeout(room.timers.question);
    room.timers.question = undefined;
  }
  if (room.timers.intermission) {
    clearTimeout(room.timers.intermission);
    room.timers.intermission = undefined;
  }
}

function checkAllAnswered(room: Room): boolean {
  for (const p of room.players.values()) {
    if (!p.isAnswered) return false;
  }
  return true;
}

function revealAnswerAndEndQuestion(room: Room) {
  if (room.timers.question) {
    clearTimeout(room.timers.question);
    room.timers.question = undefined;
  }

  const q = room.questions[room.currentQuestion];
  io.to(room.code).emit('answer-revealed', {
    correctAnswer: q.correctIndex,
    questionIndex: room.currentQuestion,
  });

  broadcastScoreUpdate(room);

  const isLastQuestion = room.currentQuestion >= room.questions.length - 1;

  setTimeout(() => {
    if (isLastQuestion) {
      endGame(room);
    } else {
      startIntermission(room);
    }
  }, 1500);
}

function startIntermission(room: Room) {
  room.phase = 'intermission';
  room.intermissionCount++;
  const nextIndex = room.currentQuestion + 1;

  io.to(room.code).emit('intermission', {
    nextIndex,
    count: room.intermissionCount,
  });

  room.timers.intermission = setTimeout(() => {
    goToNextQuestion(room);
  }, 2000);
}

function goToNextQuestion(room: Room) {
  if (room.timers.intermission) {
    clearTimeout(room.timers.intermission);
    room.timers.intermission = undefined;
  }

  room.currentQuestion++;
  room.phase = 'playing';

  room.players.forEach((p) => {
    p.isAnswered = false;
    p.lastAnswerCorrect = null;
  });

  io.to(room.code).emit('next-question', {
    questionIndex: room.currentQuestion,
  });

  const q = room.questions[room.currentQuestion];

  room.timers.question = setTimeout(() => {
    room.players.forEach((p) => {
      if (!p.isAnswered) {
        p.isAnswered = true;
        p.lastAnswerCorrect = false;
      }
    });
    revealAnswerAndEndQuestion(room);
  }, room.timeLimit * 1000);
}

function endGame(room: Room) {
  clearRoomTimers(room);
  room.phase = 'ended';
  io.to(room.code).emit('game-ended', {
    finalRanking: getRanking(room),
  });
}

function resetRoomForPlayAgain(room: Room) {
  clearRoomTimers(room);
  room.currentQuestion = -1;
  room.phase = 'waiting';
  room.questions = [];
  room.intermissionCount = 0;
  room.players.forEach((p) => {
    p.score = 0;
    p.isAnswered = false;
    p.lastAnswerCorrect = null;
  });
}

io.on('connection', (socket: Socket) => {
  socket.on('get-room-state', ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    socket.emit('room-state', {
      players: getPlayersArray(room),
      roomName: room.name,
      category: room.category,
      timeLimit: room.timeLimit,
      questionCount: room.questionCount,
      phase: room.phase,
    });
  });

  socket.on(
    'create-room',
    (
      payload: {
        roomName: string;
        category: Category;
        questionCount: number;
        timeLimit: number;
        playerName: string;
        avatar: string;
      },
      callback: (resp: { code: string }) => void
    ) => {
      const code = generateInviteCode();
      const player: Player = {
        id: socket.id,
        name: payload.playerName,
        avatar: payload.avatar,
        score: 0,
        isHost: true,
        isAnswered: false,
        lastAnswerCorrect: null,
        roomCode: code,
      };

      const room: Room = {
        code,
        name: payload.roomName,
        category: payload.category,
        questionCount: payload.questionCount,
        timeLimit: payload.timeLimit,
        hostId: socket.id,
        phase: 'waiting',
        players: new Map([[socket.id, player]]),
        questions: [],
        currentQuestion: -1,
        timers: {},
        intermissionCount: 0,
      };

      rooms.set(code, room);
      playerRoomMap.set(socket.id, code);
      socket.join(code);

      callback?.({ code });
      io.to(code).emit('player-joined', {
        players: getPlayersArray(room),
      });
    }
  );

  socket.on(
    'quick-match',
    (
      payload: { playerName: string; avatar: string },
      callback: (resp: { code: string }) => void
    ) => {
      let matchedRoom: Room | undefined;
      for (const r of rooms.values()) {
        if (r.phase === 'waiting' && r.players.size < 8) {
          matchedRoom = r;
          break;
        }
      }

      if (matchedRoom) {
        const player: Player = {
          id: socket.id,
          name: payload.playerName,
          avatar: payload.avatar,
          score: 0,
          isHost: false,
          isAnswered: false,
          lastAnswerCorrect: null,
          roomCode: matchedRoom.code,
        };
        matchedRoom.players.set(socket.id, player);
        playerRoomMap.set(socket.id, matchedRoom.code);
        socket.join(matchedRoom.code);

        callback?.({ code: matchedRoom.code });
        io.to(matchedRoom.code).emit('player-joined', {
          players: getPlayersArray(matchedRoom),
        });
      } else {
        const code = generateInviteCode();
        const player: Player = {
          id: socket.id,
          name: payload.playerName,
          avatar: payload.avatar,
          score: 0,
          isHost: true,
          isAnswered: false,
          lastAnswerCorrect: null,
          roomCode: code,
        };
        const room: Room = {
          code,
          name: '快速匹配房间',
          category: 'tech',
          questionCount: 10,
          timeLimit: 15,
          hostId: socket.id,
          phase: 'waiting',
          players: new Map([[socket.id, player]]),
          questions: [],
          currentQuestion: -1,
          timers: {},
          intermissionCount: 0,
        };
        rooms.set(code, room);
        playerRoomMap.set(socket.id, code);
        socket.join(code);

        callback?.({ code });
        io.to(code).emit('player-joined', {
          players: getPlayersArray(room),
        });
      }
    }
  );

  socket.on(
    'join-room',
    (
      payload: { code: string; playerName: string; avatar: string },
      callback: (resp: { success: boolean; message?: string }) => void
    ) => {
      const code = payload.code.toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        return callback?.({ success: false, message: '房间不存在' });
      }
      if (room.phase !== 'waiting') {
        return callback?.({ success: false, message: '游戏已经开始，无法加入' });
      }
      if (room.players.size >= 8) {
        return callback?.({ success: false, message: '房间人数已满' });
      }

      const player: Player = {
        id: socket.id,
        name: payload.playerName,
        avatar: payload.avatar,
        score: 0,
        isHost: false,
        isAnswered: false,
        lastAnswerCorrect: null,
        roomCode: code,
      };

      room.players.set(socket.id, player);
      playerRoomMap.set(socket.id, code);
      socket.join(code);

      callback?.({ success: true });
      io.to(code).emit('player-joined', {
        players: getPlayersArray(room),
      });
    }
  );

  socket.on('start-game', ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    if (room.phase !== 'waiting') return;
    if (room.players.size < 1) return;

    room.questions = getRandomQuestions(room.category, room.questionCount);
    room.currentQuestion = 0;
    room.phase = 'playing';
    room.intermissionCount = 0;

    room.players.forEach((p) => {
      p.score = 0;
      p.isAnswered = false;
      p.lastAnswerCorrect = null;
    });

    io.to(code).emit('game-started', {
      questions: room.questions,
    });

    const q = room.questions[0];

    room.timers.question = setTimeout(() => {
      room.players.forEach((p) => {
        if (!p.isAnswered) {
          p.isAnswered = true;
          p.lastAnswerCorrect = false;
        }
      });
      revealAnswerAndEndQuestion(room);
    }, room.timeLimit * 1000);
  });

  socket.on(
    'submit-answer',
    ({
      code,
      questionIndex,
      answer,
      timeSpent,
    }: {
      code: string;
      questionIndex: number;
      answer: number;
      timeSpent: number;
    }) => {
      const room = rooms.get(code);
      if (!room) return;
      if (room.phase !== 'playing') return;
      if (questionIndex !== room.currentQuestion) return;

      const player = room.players.get(socket.id);
      if (!player || player.isAnswered) return;

      player.isAnswered = true;
      const q = room.questions[questionIndex];
      const isCorrect = answer === q.correctIndex;
      player.lastAnswerCorrect = isCorrect;
      const addScore = calculateScore(isCorrect, timeSpent, room.timeLimit);
      player.score += addScore;

      broadcastScoreUpdate(room);

      if (checkAllAnswered(room)) {
        revealAnswerAndEndQuestion(room);
      }
    }
  );

  socket.on('play-again', ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error-message', { message: '只有房主可以开始新一局' });
      return;
    }

    resetRoomForPlayAgain(room);
    io.to(code).emit('player-joined', {
      players: getPlayersArray(room),
    });
    io.to(code).emit('room-state', {
      players: getPlayersArray(room),
      roomName: room.name,
      category: room.category,
      timeLimit: room.timeLimit,
      questionCount: room.questionCount,
      phase: 'waiting',
    });
  });

  socket.on('leave-room', ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    handlePlayerDisconnect(socket.id, room);
  });

  socket.on('disconnect', () => {
    const code = playerRoomMap.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (room) {
      handlePlayerDisconnect(socket.id, room);
    } else {
      playerRoomMap.delete(socket.id);
    }
  });

  function handlePlayerDisconnect(playerId: string, room: Room) {
    const wasHost = room.hostId === playerId;
    room.players.delete(playerId);
    playerRoomMap.delete(playerId);
    socket.leave(room.code);

    clearRoomTimers(room);

    if (room.players.size === 0) {
      rooms.delete(room.code);
      return;
    }

    if (wasHost) {
      const firstPlayer = Array.from(room.players.values())[0];
      firstPlayer.isHost = true;
      room.hostId = firstPlayer.id;
    }

    io.to(room.code).emit('player-left', {
      players: getPlayersArray(room),
    });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

server.listen(PORT, () => {
  console.log(`\n⚡ 知识竞技对战服务端已启动`);
  console.log(`📍 HTTP 服务:  http://localhost:${PORT}`);
  console.log(`🔌 Socket 服务: ws://localhost:${PORT}`);
  console.log(`🏥 健康检查:   http://localhost:${PORT}/api/health\n`);
});
