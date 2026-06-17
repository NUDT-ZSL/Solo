import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'games.json');

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

interface Card {
  id: string;
  suit: string;
  rank: string;
  color?: string;
  value?: number;
}

interface Player {
  id: string;
  name: string;
  color: string;
  hand: Card[];
  score: number;
  playCount: number;
}

interface PlayRecord {
  id: string;
  playerId: string;
  cards: Card[];
  playType: string;
  timestamp: number;
  handCounts: Record<string, number>;
}

interface GameSession {
  id: string;
  gameType: 'landlord' | 'uno';
  players: Player[];
  records: PlayRecord[];
  startTime: number;
  endTime?: number;
  winnerId?: string;
  currentPlayerIndex: number;
  config: {
    playerCount: number;
    playerNames: string[];
  };
}

interface GameListItem {
  id: string;
  gameType: 'landlord' | 'uno';
  startTime: number;
  endTime?: number;
  winnerName?: string;
  playerCount: number;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ games: [] }, null, 2));
  }
}

function readGames(): GameSession[] {
  ensureDataDir();
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.games || [];
  } catch (error) {
    console.error('读取游戏数据失败:', error);
    return [];
  }
}

function writeGames(games: GameSession[]): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ games }, null, 2));
}

function toListItem(game: GameSession): GameListItem {
  const winner = game.winnerId 
    ? game.players.find(p => p.id === game.winnerId)
    : undefined;
  
  return {
    id: game.id,
    gameType: game.gameType,
    startTime: game.startTime,
    endTime: game.endTime,
    winnerName: winner?.name,
    playerCount: game.players.length
  };
}

const PLAYER_COLORS = ['#ff5252', '#4caf50', '#2196f3', '#ff9800'];
const LANDLORD_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const LANDLORD_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const UNO_COLORS = ['#f44336', '#4caf50', '#2196f3', '#ffeb3b'];
const UNO_RANKS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];

function createDeck(gameType: string): Card[] {
  const deck: Card[] = [];

  if (gameType === 'landlord') {
    for (const suit of LANDLORD_SUITS) {
      for (let i = 0; i < LANDLORD_RANKS.length; i++) {
        deck.push({
          id: uuidv4(),
          suit,
          rank: LANDLORD_RANKS[i],
          value: i
        });
      }
    }
    deck.push({ id: uuidv4(), suit: 'none', rank: '小王', value: 13 });
    deck.push({ id: uuidv4(), suit: 'none', rank: '大王', value: 14 });
  } else {
    for (const color of UNO_COLORS) {
      deck.push({ id: uuidv4(), suit: 'none', rank: '0', color, value: 0 });
      for (const rank of UNO_RANKS.slice(1)) {
        deck.push({ id: uuidv4(), suit: 'none', rank, color, value: UNO_RANKS.indexOf(rank) });
        deck.push({ id: uuidv4(), suit: 'none', rank, color, value: UNO_RANKS.indexOf(rank) });
      }
    }
    for (let i = 0; i < 4; i++) {
      deck.push({ id: uuidv4(), suit: 'none', rank: 'Wild', color: '#9c27b0', value: 20 });
      deck.push({ id: uuidv4(), suit: 'none', rank: '+4', color: '#9c27b0', value: 21 });
    }
  }

  return shuffleDeck(deck);
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

app.post('/api/games', (req, res) => {
  try {
    const { gameType, config } = req.body;
    
    if (!gameType || !config) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const deck = createDeck(gameType);
    const cardsPerPlayer = gameType === 'landlord' ? 17 : 7;
    const players: Player[] = [];

    for (let i = 0; i < config.playerCount; i++) {
      const hand = deck.splice(0, cardsPerPlayer);
      players.push({
        id: uuidv4(),
        name: config.playerNames[i] || `玩家${i + 1}`,
        color: PLAYER_COLORS[i],
        hand: hand.sort((a, b) => (a.value || 0) - (b.value || 0)),
        score: 0,
        playCount: 0
      });
    }

    const game: GameSession = {
      id: uuidv4(),
      gameType,
      players,
      records: [],
      startTime: Date.now(),
      currentPlayerIndex: 0,
      config
    };

    const games = readGames();
    games.push(game);
    writeGames(games);

    res.json(game);
  } catch (error) {
    console.error('创建游戏失败:', error);
    res.status(500).json({ message: '创建游戏失败' });
  }
});

app.get('/api/games', (req, res) => {
  try {
    const games = readGames();
    const listItems = games
      .sort((a, b) => b.startTime - a.startTime)
      .map(toListItem);
    res.json(listItems);
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    res.status(500).json({ message: '获取游戏列表失败' });
  }
});

app.get('/api/games/:id', (req, res) => {
  try {
    const { id } = req.params;
    const games = readGames();
    const game = games.find(g => g.id === id);

    if (!game) {
      return res.status(404).json({ message: '牌局不存在' });
    }

    res.json(game);
  } catch (error) {
    console.error('获取游戏详情失败:', error);
    res.status(500).json({ message: '获取游戏详情失败' });
  }
});

app.post('/api/games/:id/records', (req, res) => {
  try {
    const { id } = req.params;
    const record = req.body as PlayRecord;

    if (!record || !record.playerId) {
      return res.status(400).json({ message: '记录数据不完整' });
    }

    const games = readGames();
    const gameIndex = games.findIndex(g => g.id === id);

    if (gameIndex === -1) {
      return res.status(404).json({ message: '牌局不存在' });
    }

    if (!record.id) {
      record.id = uuidv4();
    }
    record.timestamp = record.timestamp || Date.now();

    games[gameIndex].records.push(record);
    
    const playerIndex = games[gameIndex].players.findIndex(
      p => p.id === record.playerId
    );
    if (playerIndex !== -1 && record.cards.length > 0) {
      games[gameIndex].players[playerIndex].hand = 
        games[gameIndex].players[playerIndex].hand.filter(
          c => !record.cards.some(rc => rc.id === c.id)
        );
      games[gameIndex].players[playerIndex].playCount++;
    }

    games[gameIndex].currentPlayerIndex = 
      (games[gameIndex].currentPlayerIndex + 1) % games[gameIndex].players.length;

    writeGames(games);
    res.json(record);
  } catch (error) {
    console.error('添加记录失败:', error);
    res.status(500).json({ message: '添加记录失败' });
  }
});

app.post('/api/games/:id/finish', (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId } = req.body;

    const games = readGames();
    const gameIndex = games.findIndex(g => g.id === id);

    if (gameIndex === -1) {
      return res.status(404).json({ message: '牌局不存在' });
    }

    games[gameIndex].endTime = Date.now();
    games[gameIndex].winnerId = winnerId;

    writeGames(games);
    res.json(games[gameIndex]);
  } catch (error) {
    console.error('结束游戏失败:', error);
    res.status(500).json({ message: '结束游戏失败' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`牌局服务器运行在 http://localhost:${PORT}`);
  ensureDataDir();
  console.log(`数据文件: ${DATA_FILE}`);
});
