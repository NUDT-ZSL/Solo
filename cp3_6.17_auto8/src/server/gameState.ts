import { GameState, Player, Card, PlayerAction } from '../shared/types';
import { createDeck } from '../shared/cards';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'gameState.json');

function ensureDataDir(): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createInitialGameState(): GameState {
  const deck1 = createDeck(7);
  const deck2 = createDeck(7);

  const player1: Player = {
    id: 'player_local',
    nickname: '本地玩家',
    hand: deck1,
    hp: 30,
    maxHp: 30,
  };

  const player2: Player = {
    id: 'player_ai',
    nickname: 'AI对手',
    hand: deck2,
    hp: 30,
    maxHp: 30,
  };

  const state: GameState = {
    gameId: uuidv4(),
    players: [player1, player2],
    discardPile: [],
    currentTurnIndex: 0,
    turnCount: 1,
    status: 'playing',
    winnerId: null,
  };

  saveGameState(state);
  return state;
}

export function saveGameState(state: GameState): void {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function loadGameState(): GameState | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data) as GameState;
    }
  } catch (e) {
    console.error('加载游戏状态失败:', e);
  }
  return null;
}

export function getPlayerIndex(state: GameState, playerId: string): 0 | 1 | -1 {
  if (state.players[0].id === playerId) return 0;
  if (state.players[1].id === playerId) return 1;
  return -1;
}

export function findCardInHand(player: Player, cardId: string): Card | null {
  return player.hand.find((c) => c.id === cardId) || null;
}

export function validateAction(state: GameState, action: PlayerAction): {
  valid: boolean;
  reason?: string;
  card?: Card;
} {
  if (state.status !== 'playing') {
    return { valid: false, reason: '游戏已结束' };
  }

  const playerIdx = getPlayerIndex(state, action.playerId);
  if (playerIdx === -1) {
    return { valid: false, reason: '玩家不存在' };
  }

  if (state.currentTurnIndex !== playerIdx) {
    return { valid: false, reason: '当前不是你的回合' };
  }

  const player = state.players[playerIdx];
  const card = findCardInHand(player, action.cardId);
  if (!card) {
    return { valid: false, reason: '手牌中不存在该牌' };
  }

  return { valid: true, card };
}

export function applyAction(
  state: GameState,
  action: PlayerAction
): {
  newState: GameState;
  playedCard: Card | null;
  damaged: number;
} {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const playerIdx = getPlayerIndex(newState, action.playerId) as 0 | 1;
  const player = newState.players[playerIdx];
  const opponentIdx = (1 - playerIdx) as 0 | 1;
  const opponent = newState.players[opponentIdx];

  const cardIdx = player.hand.findIndex((c) => c.id === action.cardId);
  if (cardIdx === -1) {
    return { newState, playedCard: null, damaged: 0 };
  }

  const [playedCard] = player.hand.splice(cardIdx, 1);
  newState.discardPile.push(playedCard);

  const damage = playedCard.attack;
  opponent.hp = Math.max(0, opponent.hp - damage);

  newState.currentTurnIndex = opponentIdx;
  newState.turnCount++;

  if (opponent.hp <= 0) {
    newState.status = 'finished';
    newState.winnerId = player.id;
  }

  saveGameState(newState);
  return { newState, playedCard, damaged: damage };
}

export function chooseAICard(state: GameState): Card | null {
  const aiPlayer = state.players[1];
  if (aiPlayer.hand.length === 0) return null;

  const localPlayer = state.players[0];

  let bestCard: Card | null = null;
  let bestScore = -Infinity;

  for (const card of aiPlayer.hand) {
    let score = card.attack * 2;

    if (localPlayer.hp <= card.attack) {
      score += 100;
    }

    if (localPlayer.hp <= localPlayer.maxHp * 0.3) {
      score += card.attack;
    }

    score += (aiPlayer.hand.length - 1) * 0.5;
    score -= card.cost * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  return bestCard;
}
