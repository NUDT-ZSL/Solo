import { v4 as uuidv4 } from 'uuid';
import type {
  Player,
  Property,
  GameState,
  CellConfig,
  Card,
  GameConfig,
} from './types';
import { PLAYER_COLORS, PLAYER_NAMES } from './types';

function getGridCoords(position: number): { gridX: number; gridY: number } {
  if (position >= 0 && position <= 9) return { gridX: position, gridY: 0 };
  if (position >= 10 && position <= 18) return { gridX: 9, gridY: position - 9 };
  if (position >= 19 && position <= 27) return { gridX: 27 - position, gridY: 9 };
  return { gridX: 0, gridY: 36 - position };
}

export function createInitialPlayers(count: number): Player[] {
  const validCount = Math.max(2, Math.min(4, count));
  const players: Player[] = [];
  for (let i = 0; i < validCount; i++) {
    players.push({
      id: uuidv4(),
      name: PLAYER_NAMES[i],
      color: PLAYER_COLORS[i],
      cash: 1500,
      position: 0,
      gridX: 0,
      gridY: 0,
      isBankrupt: false,
      inJail: false,
      jailTurns: 0,
    });
  }
  return players;
}

export function createInitialProperties(cells: CellConfig[]): Record<number, Property> {
  const properties: Record<number, Property> = {};
  cells.forEach((cell) => {
    if (cell.type === 'property' || cell.type === 'railway' || cell.type === 'utility') {
      properties[cell.id] = {
        cellId: cell.id,
        ownerId: null,
        level: 0,
      };
    }
  });
  return properties;
}

export function createInitialState(playerCount: number, config: GameConfig): GameState {
  const players = createInitialPlayers(playerCount);
  const properties = createInitialProperties(config.cells);
  return {
    players,
    properties,
    currentPlayerIndex: 0,
    turn: 1,
    diceValue: null,
    isRolling: false,
    currentCard: null,
    gameStarted: false,
    gameOver: false,
    winnerId: null,
    message: '游戏准备就绪，点击开始游戏',
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function drawRandomCard(cards: Card[]): Card {
  return cards[Math.floor(Math.random() * cards.length)];
}

export function calculateRent(
  cell: CellConfig,
  property: Property | undefined,
  owner: Player | undefined
): number {
  if (!property || !owner || property.ownerId === null) return 0;
  if (!cell.baseRent) return 0;
  const multipliers = [1, 1, 2, 4];
  return cell.baseRent * multipliers[property.level];
}

export function getPlayerAssets(
  player: Player,
  properties: Record<number, Property>,
  cells: CellConfig[]
): { totalAssets: number; propertyCount: number } {
  let totalAssets = player.cash;
  let propertyCount = 0;
  Object.values(properties).forEach((p) => {
    if (p.ownerId === player.id) {
      propertyCount++;
      const cell = cells.find((c) => c.id === p.cellId);
      if (cell && cell.price) {
        totalAssets += cell.price * (1 + p.level * 0.5);
      }
    }
  });
  return { totalAssets, propertyCount };
}

export function getRankings(
  players: Player[],
  properties: Record<number, Property>,
  cells: CellConfig[]
): Array<{ player: Player; totalAssets: number; propertyCount: number }> {
  return players
    .map((player) => {
      const { totalAssets, propertyCount } = getPlayerAssets(player, properties, cells);
      return { player, totalAssets, propertyCount };
    })
    .sort((a, b) => b.totalAssets - a.totalAssets);
}

export function movePlayer(
  state: GameState,
  playerId: string,
  steps: number,
  cells: CellConfig[]
): GameState {
  const newPlayers = state.players.map((p) => {
    if (p.id !== playerId) return p;
    let newPosition = (p.position + steps + 40) % 40;
    const { gridX, gridY } = getGridCoords(newPosition);
    let cash = p.cash;
    if (p.position + steps >= 40) {
      cash += 200;
    }
    return { ...p, position: newPosition, gridX, gridY, cash };
  });
  return { ...state, players: newPlayers };
}

export function movePlayerToPosition(
  state: GameState,
  playerId: string,
  position: number,
  cells: CellConfig[]
): GameState {
  const currentPlayer = state.players.find((p) => p.id === playerId);
  if (!currentPlayer) return state;
  const steps = (position - currentPlayer.position + 40) % 40;
  return movePlayer(state, playerId, steps, cells);
}

export function buyProperty(
  state: GameState,
  playerId: string,
  cellId: number,
  cells: CellConfig[]
): GameState {
  const cell = cells.find((c) => c.id === cellId);
  if (!cell || !cell.price) return state;
  const property = state.properties[cellId];
  if (!property || property.ownerId !== null) return state;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.cash < cell.price) return state;

  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, cash: p.cash - cell.price } : p
  );
  const newProperties = {
    ...state.properties,
    [cellId]: { ...property, ownerId: playerId },
  };
  return {
    ...state,
    players: newPlayers,
    properties: newProperties,
    message: `${player.name} 购买了 ${cell.name}`,
  };
}

export function buildHouse(
  state: GameState,
  playerId: string,
  cellId: number,
  cells: CellConfig[]
): GameState {
  const cell = cells.find((c) => c.id === cellId);
  if (!cell || !cell.price) return state;
  const property = state.properties[cellId];
  if (!property || property.ownerId !== playerId) return state;
  if (property.level >= 3) return state;

  const buildCost = Math.floor(cell.price * 0.5);
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.cash < buildCost) return state;

  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, cash: p.cash - buildCost } : p
  );
  const newProperties = {
    ...state.properties,
    [cellId]: { ...property, level: (property.level + 1) as 1 | 2 | 3 },
  };
  return {
    ...state,
    players: newPlayers,
    properties: newProperties,
    message: `${player.name} 在 ${cell.name} 建造了房屋`,
  };
}

export function payRent(
  state: GameState,
  payerId: string,
  cellId: number,
  cells: CellConfig[]
): GameState {
  const property = state.properties[cellId];
  if (!property || property.ownerId === null || property.ownerId === payerId) return state;
  const cell = cells.find((c) => c.id === cellId);
  if (!cell) return state;

  const owner = state.players.find((p) => p.id === property.ownerId);
  const payer = state.players.find((p) => p.id === payerId);
  if (!owner || !payer) return state;

  const rent = calculateRent(cell, property, owner);
  const newPlayers = state.players.map((p) => {
    if (p.id === payerId) return { ...p, cash: p.cash - rent };
    if (p.id === property.ownerId) return { ...p, cash: p.cash + rent };
    return p;
  });
  return {
    ...state,
    players: newPlayers,
    message: `${payer.name} 向 ${owner.name} 支付租金 ${rent} 元`,
  };
}

export function adjustPlayerCash(
  state: GameState,
  playerId: string,
  amount: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, cash: p.cash + amount } : p
  );
  return {
    ...state,
    players: newPlayers,
    message: amount >= 0 ? `${player.name} 获得 ${amount} 元` : `${player.name} 支付 ${Math.abs(amount)} 元`,
  };
}

export function sendToJail(state: GameState, playerId: string): GameState {
  const newPlayers = state.players.map((p) =>
    p.id === playerId
      ? { ...p, inJail: true, jailTurns: 0, position: 10, gridX: 0, gridY: 1 }
      : p
  );
  return { ...state, players: newPlayers };
}

export function checkBankruptcy(state: GameState): GameState {
  const newPlayers = state.players.map((p) => {
    if (!p.isBankrupt && p.cash < 0) {
      return { ...p, isBankrupt: true, cash: 0 };
    }
    return p;
  });
  const activePlayers = newPlayers.filter((p) => !p.isBankrupt);
  const gameOver = activePlayers.length <= 1;
  const winnerId = gameOver && activePlayers.length === 1 ? activePlayers[0].id : null;

  return {
    ...state,
    players: newPlayers,
    gameOver,
    winnerId,
    message: gameOver ? `游戏结束！${activePlayers[0]?.name || '无'} 获胜！` : state.message,
  };
}

export function nextTurn(state: GameState): GameState {
  if (state.gameOver) return state;
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  let skipCount = 0;
  while (state.players[nextIndex].isBankrupt && skipCount < state.players.length) {
    nextIndex = (nextIndex + 1) % state.players.length;
    skipCount++;
  }
  const currentPlayer = state.players[nextIndex];
  let newTurn = state.turn;
  if (nextIndex === 0) {
    newTurn = state.turn + 1;
  }
  let newPlayers = state.players;
  if (currentPlayer.inJail) {
    newPlayers = state.players.map((p) =>
      p.id === currentPlayer.id
        ? { ...p, jailTurns: p.jailTurns + 1, inJail: p.jailTurns >= 2 ? false : p.inJail }
        : p
    );
  }
  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextIndex,
    turn: newTurn,
    diceValue: null,
    isRolling: false,
    currentCard: null,
    message: `${state.players[nextIndex].name} 的回合`,
  };
}

export function startGame(state: GameState): GameState {
  return {
    ...state,
    gameStarted: true,
    message: `${state.players[0].name} 的回合，请掷骰子`,
  };
}
