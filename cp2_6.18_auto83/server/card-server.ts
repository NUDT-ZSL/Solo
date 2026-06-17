import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GameState {
  id: string;
  gameType: string;
  players: Player[];
  currentPlayerIndex: number;
  playHistory: PlayRecord[];
  tableCards: Card[];
  isGameOver: boolean;
  winnerId?: string;
  startTime: number;
  endTime?: number;
  roundNumber: number;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  position: string;
  color: string;
  score: number;
}

interface Card {
  id: string;
  suit?: string;
  rank: string;
  isFaceUp: boolean;
  color?: string;
}

interface PlayRecord {
  id: string;
  playerId: string;
  cards: Card[];
  cardType?: string;
  timestamp: number;
  roundNumber: number;
}

interface GameConfig {
  gameType: string;
  playerNames: string[];
}

interface GameListItem {
  id: string;
  gameType: string;
  startTime: number;
  endTime?: number;
  playerNames: string[];
  winnerId?: string;
}

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');

type GameStore = Record<string, GameState>;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadGames(): GameStore {
  ensureDataDir();
  if (!fs.existsSync(GAMES_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(GAMES_FILE, 'utf-8');
    return JSON.parse(data) as GameStore;
  } catch (error) {
    console.error('读取游戏数据失败:', error);
    return {};
  }
}

function saveGames(games: GameStore): void {
  ensureDataDir();
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
}

function validateGameConfig(config: GameConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.gameType) {
    errors.push('游戏类型不能为空');
  } else if (!['dou dizhu', 'uno'].includes(config.gameType)) {
    errors.push('不支持的游戏类型');
  }

  if (!config.playerNames || config.playerNames.length < 2) {
    errors.push('至少需要2名玩家');
  } else if (config.playerNames.length > 4) {
    errors.push('最多支持4名玩家');
  }

  return { valid: errors.length === 0, errors };
}

function validateGameState(gameState: GameState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!gameState.id) {
    errors.push('游戏ID不能为空');
  }

  if (!gameState.gameType) {
    errors.push('游戏类型不能为空');
  } else if (!['dou dizhu', 'uno'].includes(gameState.gameType)) {
    errors.push('不支持的游戏类型');
  }

  if (!gameState.players || gameState.players.length === 0) {
    errors.push('玩家列表不能为空');
  } else {
    if (gameState.players.length < 2 || gameState.players.length > 4) {
      errors.push('玩家数量必须在2-4人之间');
    }

    const playerIds = new Set<string>();
    const cardIds = new Set<string>();
    for (const player of gameState.players) {
      if (!player.id) {
        errors.push('玩家ID不能为空');
      }
      if (playerIds.has(player.id)) {
        errors.push(`玩家ID重复: ${player.id}`);
      }
      playerIds.add(player.id);

      if (!player.name) {
        errors.push('玩家名称不能为空');
      }

      for (const card of player.hand) {
        if (!card.id) {
          errors.push('牌的ID不能为空');
        }
        if (cardIds.has(card.id)) {
          errors.push(`牌的ID重复: ${card.id}`);
        }
        cardIds.add(card.id);
      }
    }
  }

  if (gameState.currentPlayerIndex < 0 || gameState.currentPlayerIndex >= gameState.players.length) {
    errors.push('当前玩家索引无效');
  }

  if (!Array.isArray(gameState.playHistory)) {
    errors.push('出牌历史格式错误');
  } else {
    const playerIds = gameState.players.map((p: Player) => p.id);

    for (let i = 0; i < gameState.playHistory.length; i++) {
      const record = gameState.playHistory[i];
      if (!record.playerId || !playerIds.includes(record.playerId)) {
        errors.push(`第${i + 1}步出牌玩家ID无效`);
        continue;
      }

      if (!record.cards || record.cards.length === 0) {
        errors.push(`第${i + 1}步出牌为空`);
      }

      if (record.timestamp <= 0) {
        errors.push(`第${i + 1}步出牌时间戳无效`);
      }

      if (i > 0) {
        const prevRecord = gameState.playHistory[i - 1];
        const prevPlayerIndex = playerIds.indexOf(prevRecord.playerId);
        const currentPlayerIndex = playerIds.indexOf(record.playerId);
        if (currentPlayerIndex !== (prevPlayerIndex + 1) % gameState.players.length) {
          errors.push(`第${i + 1}步出牌顺序不合法，应由下一位玩家出牌`);
        }

        if (record.timestamp < prevRecord.timestamp) {
          errors.push(`第${i + 1}步出牌时间戳早于上一步`);
        }
      }
    }
  }

  if (gameState.isGameOver && !gameState.winnerId) {
    errors.push('游戏已结束但未设置获胜者');
  }

  if (gameState.isGameOver && !gameState.endTime) {
    errors.push('游戏已结束但未设置结束时间');
  }

  return { valid: errors.length === 0, errors };
}

function validatePlayData(game: GameState, playerId: string, cards: Card[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!playerId) {
    errors.push('玩家ID不能为空');
  }

  const playerIndex = game.players.findIndex((p: Player) => p.id === playerId);
  if (playerIndex === -1) {
    errors.push('玩家不存在');
    return { valid: false, errors };
  }

  if (playerIndex !== game.currentPlayerIndex) {
    errors.push('不是该玩家的回合');
    return { valid: false, errors };
  }

  if (!cards || cards.length === 0) {
    errors.push('出牌不能为空');
    return { valid: false, errors };
  }

  const player = game.players[playerIndex];
  if (cards.length > player.hand.length) {
    errors.push(`出牌数量(${cards.length})超过手牌数量(${player.hand.length})`);
    return { valid: false, errors };
  }

  for (const card of cards) {
    if (!card.id) {
      errors.push('牌的ID不能为空');
      continue;
    }
    const hasCard = player.hand.some((c: Card) => c.id === card.id);
    if (!hasCard) {
      errors.push(`玩家没有这张牌: ${card.id}`);
    }
  }

  const playedCardIds = cards.map((c: Card) => c.id);
  const uniqueIds = new Set(playedCardIds);
  if (uniqueIds.size !== playedCardIds.length) {
    errors.push('出牌中存在重复的牌');
  }

  return { valid: errors.length === 0, errors };
}

app.post('/api/games', (req: Request, res: Response) => {
  const config: GameConfig = req.body;

  const validation = validateGameConfig(config);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const games = loadGames();

  const positions = ['bottom', 'right', 'top', 'left'];
  const colors = ['#ff5252', '#448aff', '#69f0ae', '#ffab40'];

  const newGame: GameState = {
    id: uuidv4(),
    gameType: config.gameType,
    players: config.playerNames.map((name: string, index: number) => ({
      id: uuidv4(),
      name,
      hand: [],
      position: positions[index],
      color: colors[index],
      score: 0
    })),
    currentPlayerIndex: 0,
    playHistory: [],
    tableCards: [],
    isGameOver: false,
    startTime: Date.now(),
    roundNumber: 1
  };

  games[newGame.id] = newGame;
  saveGames(games);

  res.status(201).json(newGame);
});

app.get('/api/games', (req: Request, res: Response) => {
  const games = loadGames();

  const gameList: GameListItem[] = Object.values(games).map((game: GameState) => ({
    id: game.id,
    gameType: game.gameType,
    startTime: game.startTime,
    endTime: game.endTime,
    playerNames: game.players.map((p: Player) => p.name),
    winnerId: game.winnerId
  }));

  gameList.sort((a: GameListItem, b: GameListItem) => b.startTime - a.startTime);

  res.json(gameList);
});

app.get('/api/games/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const games = loadGames();

  const game = games[id];
  if (!game) {
    return res.status(404).json({ error: '游戏不存在' });
  }

  res.json(game);
});

app.put('/api/games/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const gameState: GameState = req.body;

  const validation = validateGameState(gameState);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  if (gameState.id !== id) {
    return res.status(400).json({ error: '游戏ID不匹配' });
  }

  const games = loadGames();

  if (!games[id]) {
    return res.status(404).json({ error: '游戏不存在' });
  }

  games[id] = gameState;
  saveGames(games);

  res.json({ success: true, gameId: id });
});

app.post('/api/games/:id/plays', (req: Request, res: Response) => {
  const { id } = req.params;
  const { playerId, cards, timestamp } = req.body;

  const games = loadGames();
  const game = games[id];

  if (!game) {
    return res.status(404).json({ error: '游戏不存在' });
  }

  if (game.isGameOver) {
    return res.status(400).json({ error: '游戏已结束' });
  }

  const validation = validatePlayData(game, playerId, cards || []);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const playerIndex = game.players.findIndex((p: Player) => p.id === playerId);
  const player = game.players[playerIndex];

  const playRecord: PlayRecord = {
    id: uuidv4(),
    playerId,
    cards: cards.map((c: Card) => ({ ...c, isFaceUp: true })),
    timestamp: timestamp || Date.now(),
    roundNumber: game.roundNumber
  };

  game.players[playerIndex].hand = player.hand.filter(
    (c: Card) => !cards.some((played: Card) => played.id === c.id)
  );

  game.playHistory.push(playRecord);
  game.tableCards.push(...playRecord.cards);
  game.currentPlayerIndex = (playerIndex + 1) % game.players.length;

  if (game.players[playerIndex].hand.length === 0) {
    game.isGameOver = true;
    game.winnerId = playerId;
    game.endTime = Date.now();
  }

  if (game.currentPlayerIndex === 0) {
    game.roundNumber++;
  }

  games[id] = game;
  saveGames(games);

  res.json(game);
});

app.post('/api/games/validate', (req: Request, res: Response) => {
  const gameState: GameState = req.body;
  const validation = validateGameState(gameState);
  res.json(validation);
});

app.listen(PORT, () => {
  console.log(`🎴 牌类游戏服务运行在 http://localhost:${PORT}`);
  console.log(`📁 数据存储在: ${GAMES_FILE}`);
});

export default app;
