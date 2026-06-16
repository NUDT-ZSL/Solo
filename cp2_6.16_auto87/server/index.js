import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mockWords } from "../src/services/mockWords.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const RECORDS_FILE = path.join(DATA_DIR, "records.json");

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];
const QUESTION_TYPES = ["en2cn", "cn2en"];
const TIME_LIMIT = 20000;
const POINTS_PER_CORRECT = 10;

const fileLocks = {
  rooms: false,
  users: false,
  records: false,
};

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  [ROOMS_FILE, USERS_FILE, RECORDS_FILE].forEach((file) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]");
    }
  });
};

const readJSONFile = async (filePath, lockKey) => {
  while (fileLocks[lockKey]) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  fileLocks[lockKey] = true;
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } finally {
    fileLocks[lockKey] = false;
  }
};

const writeJSONFile = async (filePath, data, lockKey) => {
  while (fileLocks[lockKey]) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  fileLocks[lockKey] = true;
  try {
    const tempFile = filePath + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, filePath);
  } finally {
    fileLocks[lockKey] = false;
  }
};

const readRooms = () => readJSONFile(ROOMS_FILE, "rooms");
const writeRooms = (data) => writeJSONFile(ROOMS_FILE, data, "rooms");
const readUsers = () => readJSONFile(USERS_FILE, "users");
const writeUsers = (data) => writeJSONFile(USERS_FILE, data, "users");
const readRecords = () => readJSONFile(RECORDS_FILE, "records");
const writeRecords = (data) => writeJSONFile(RECORDS_FILE, data, "records");

const generateHistoryData = () => {
  const history = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    history.push({
      date: date.toISOString().split("T")[0],
      games: Math.floor(Math.random() * 5) + 1,
      wins: Math.floor(Math.random() * 3),
      vocabulary: 1000 + Math.floor(Math.random() * 50),
    });
  }
  return history;
};

const getRandomWord = (difficulty) => {
  const words = mockWords[difficulty];
  return words[Math.floor(Math.random() * words.length)];
};

const generateQuestion = (difficulty) => {
  const word = getRandomWord(difficulty);
  const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
  let question, correctAnswer;
  if (type === "en2cn") {
    question = word.word;
    correctAnswer = word.meaning;
  } else {
    question = word.meaning;
    correctAnswer = word.word;
  }
  return {
    id: uuidv4(),
    type,
    question,
    correctAnswer,
    word: word.word,
    meaning: word.meaning,
    pos: word.pos,
    startTime: Date.now(),
    timeLimit: TIME_LIMIT,
  };
};

app.get("/", (req, res) => {
  res.json({ message: "Word Battle API is running" });
});

app.post("/api/users", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const users = await readUsers();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newUser = {
      id: uuidv4(),
      name,
      color,
      totalGames: 0,
      wins: 0,
      vocabulary: 1000,
      history: generateHistoryData(),
      createdAt: Date.now(),
    };
    users.push(newUser);
    await writeUsers(users);
    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const users = await readUsers();
    const user = users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/rooms", async (req, res) => {
  try {
    const rooms = await readRooms();
    const waitingRooms = rooms.filter((r) => r.status === "waiting");
    res.json(waitingRooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rooms", async (req, res) => {
  try {
    const { name, rounds, difficulty, creatorId } = req.body;
    if (!name || !rounds || !difficulty || !creatorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (![5, 10].includes(rounds)) {
      return res.status(400).json({ error: "Rounds must be 5 or 10" });
    }
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty" });
    }
    const users = await readUsers();
    const creator = users.find((u) => u.id === creatorId);
    if (!creator) {
      return res.status(404).json({ error: "Creator not found" });
    }
    const rooms = await readRooms();
    const newRoom = {
      id: uuidv4(),
      name,
      rounds,
      difficulty,
      creatorId,
      status: "waiting",
      currentRound: 0,
      players: [
        {
          userId: creator.id,
          name: creator.name,
          color: creator.color,
          score: 0,
          answers: [],
        },
      ],
      currentQuestion: null,
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
    };
    rooms.push(newRoom);
    await writeRooms(rooms);
    res.json(newRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rooms/:id/join", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "UserId is required" });
    }
    const rooms = await readRooms();
    const roomIndex = rooms.findIndex((r) => r.id === id);
    if (roomIndex === -1) {
      return res.status(404).json({ error: "Room not found" });
    }
    const room = rooms[roomIndex];
    if (room.status !== "waiting") {
      return res.status(400).json({ error: "Room is not waiting for players" });
    }
    const existingPlayer = room.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      return res.status(400).json({ error: "User already in room" });
    }
    const users = await readUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    room.players.push({
      userId: user.id,
      name: user.name,
      color: user.color,
      score: 0,
      answers: [],
    });
    rooms[roomIndex] = room;
    await writeRooms(rooms);
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rooms/:id/start", async (req, res) => {
  try {
    const { id } = req.params;
    const rooms = await readRooms();
    const roomIndex = rooms.findIndex((r) => r.id === id);
    if (roomIndex === -1) {
      return res.status(404).json({ error: "Room not found" });
    }
    const room = rooms[roomIndex];
    if (room.status !== "waiting") {
      return res.status(400).json({ error: "Room is not waiting" });
    }
    if (room.players.length < 2) {
      return res.status(400).json({ error: "At least 2 players required" });
    }
    room.status = "playing";
    room.currentRound = 1;
    room.startedAt = Date.now();
    room.currentQuestion = generateQuestion(room.difficulty);
    room.players.forEach((p) => {
      p.score = 0;
      p.answers = [];
    });
    rooms[roomIndex] = room;
    await writeRooms(rooms);
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rooms = await readRooms();
    const room = rooms.find((r) => r.id === id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    if (room.currentQuestion) {
      const elapsed = Date.now() - room.currentQuestion.startTime;
      const remaining = Math.max(0, TIME_LIMIT - elapsed);
      if (remaining === 0 && room.status === "playing") {
        const allAnswered = room.players.every(
          (p) =>
            p.answers.length === room.currentRound ||
            p.answers.some(
              (a) => a.questionId === room.currentQuestion.id && a.submitted
            )
        );
        if (!allAnswered) {
          room.players.forEach((p) => {
            const hasAnswered = p.answers.some(
              (a) => a.questionId === room.currentQuestion.id
            );
            if (!hasAnswered) {
              p.answers.push({
                questionId: room.currentQuestion.id,
                answer: null,
                correct: false,
                submitted: false,
                timeout: true,
                timestamp: Date.now(),
              });
            }
          });
          if (room.currentRound >= room.rounds) {
            room.status = "finished";
            room.endedAt = Date.now();
            await updatePlayerStats(room);
          }
          const rooms2 = await readRooms();
          const idx = rooms2.findIndex((r) => r.id === id);
          if (idx !== -1) {
            rooms2[idx] = room;
            await writeRooms(rooms2);
          }
        }
      }
      room.currentQuestion.remainingTime = Math.max(
        0,
        TIME_LIMIT - (Date.now() - room.currentQuestion.startTime)
      );
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rooms/:id/answer", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, answer } = req.body;
    if (!userId || answer === undefined || answer === null) {
      return res.status(400).json({ error: "UserId and answer are required" });
    }
    const rooms = await readRooms();
    const roomIndex = rooms.findIndex((r) => r.id === id);
    if (roomIndex === -1) {
      return res.status(404).json({ error: "Room not found" });
    }
    const room = rooms[roomIndex];
    if (room.status !== "playing") {
      return res.status(400).json({ error: "Room is not playing" });
    }
    if (!room.currentQuestion) {
      return res.status(400).json({ error: "No current question" });
    }
    const player = room.players.find((p) => p.userId === userId);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    const existingAnswer = player.answers.find(
      (a) => a.questionId === room.currentQuestion.id
    );
    if (existingAnswer) {
      return res.status(400).json({ error: "Already answered" });
    }
    const elapsed = Date.now() - room.currentQuestion.startTime;
    const isTimeout = elapsed > TIME_LIMIT;
    const trimmedAnswer = answer.toString().trim();
    const trimmedCorrect = room.currentQuestion.correctAnswer.toString().trim();
    const correct = !isTimeout && trimmedAnswer.toLowerCase() === trimmedCorrect.toLowerCase();
    if (correct) {
      player.score += POINTS_PER_CORRECT;
    }
    player.answers.push({
      questionId: room.currentQuestion.id,
      answer,
      correct,
      submitted: true,
      timeout: isTimeout,
      timestamp: Date.now(),
    });
    const allAnswered = room.players.every(
      (p) =>
        p.answers.filter((a) => a.questionId === room.currentQuestion.id)
          .length > 0
    );
    if (allAnswered) {
      if (room.currentRound >= room.rounds) {
        room.status = "finished";
        room.endedAt = Date.now();
        await updatePlayerStats(room);
      }
    }
    rooms[roomIndex] = room;
    await writeRooms(rooms);
    res.json({
      correct,
      score: player.score,
      correctAnswer: room.currentQuestion.correctAnswer,
      allAnswered,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rooms/:id/next", async (req, res) => {
  try {
    const { id } = req.params;
    const rooms = await readRooms();
    const roomIndex = rooms.findIndex((r) => r.id === id);
    if (roomIndex === -1) {
      return res.status(404).json({ error: "Room not found" });
    }
    const room = rooms[roomIndex];
    if (room.status !== "playing") {
      return res.status(400).json({ error: "Room is not playing" });
    }
    if (room.currentRound >= room.rounds) {
      room.status = "finished";
      room.endedAt = Date.now();
      await updatePlayerStats(room);
      rooms[roomIndex] = room;
      await writeRooms(rooms);
      return res.json(room);
    }
    room.currentRound += 1;
    room.currentQuestion = generateQuestion(room.difficulty);
    rooms[roomIndex] = room;
    await writeRooms(rooms);
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updatePlayerStats = async (room) => {
  const users = await readUsers();
  const records = await readRecords();
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const winnerIds = [];
  if (sortedPlayers.length > 0 && sortedPlayers[0].score > 0) {
    const maxScore = sortedPlayers[0].score;
    sortedPlayers.forEach((p) => {
      if (p.score === maxScore) winnerIds.push(p.userId);
    });
  }
  room.players.forEach((player) => {
    const userIndex = users.findIndex((u) => u.id === player.userId);
    if (userIndex !== -1) {
      const user = users[userIndex];
      const correctCount = player.answers.filter((a) => a.correct).length;
      const vocabChange = Math.floor(correctCount * 2 - (room.rounds - correctCount));
      user.totalGames += 1;
      if (winnerIds.includes(player.userId)) {
        user.wins += 1;
      }
      user.vocabulary = Math.max(100, user.vocabulary + vocabChange);
      const today = new Date().toISOString().split("T")[0];
      const lastHistory = user.history[user.history.length - 1];
      if (lastHistory && lastHistory.date === today) {
        lastHistory.games += 1;
        if (winnerIds.includes(player.userId)) {
          lastHistory.wins += 1;
        }
        lastHistory.vocabulary = user.vocabulary;
      } else {
        user.history.push({
          date: today,
          games: 1,
          wins: winnerIds.includes(player.userId) ? 1 : 0,
          vocabulary: user.vocabulary,
        });
        if (user.history.length > 7) {
          user.history = user.history.slice(-7);
        }
      }
      users[userIndex] = user;
    }
  });
  const record = {
    id: uuidv4(),
    roomId: room.id,
    roomName: room.name,
    difficulty: room.difficulty,
    rounds: room.rounds,
    players: room.players.map((p) => ({
      userId: p.userId,
      name: p.name,
      color: p.color,
      score: p.score,
    })),
    winners: winnerIds,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
  };
  records.push(record);
  await writeUsers(users);
  await writeRecords(records);
};

app.get("/api/records", async (req, res) => {
  try {
    const records = await readRecords();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

ensureDataDir();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
