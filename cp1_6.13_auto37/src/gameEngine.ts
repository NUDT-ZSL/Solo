import {
  GameState,
  GameAction,
  PlaceAction,
  UpgradeAction,
  HexCell,
  Tower,
  PlayerId,
  HexCoord,
  ChainReactionEvent,
} from './types';
import {
  findCell,
  getAdjacentHexes,
  getHexDistance,
  generateHexGrid,
} from './mapGenerator';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_ENERGY = 3;
const ENERGY_PER_TURN = 2;
const PLACE_COST = 1;
const UPGRADE_COST = 2;
const MAX_TOWER_LEVEL = 3;
const MAX_TURNS = 20;
const ELECTRIC_COOLDOWN = 3;

export function createInitialState(player1Name: string, player2Name: string): GameState {
  const map = generateHexGrid();
  
  return {
    map,
    players: [
      { id: 1, name: player1Name, energy: INITIAL_ENERGY },
      { id: 2, name: player2Name, energy: INITIAL_ENERGY },
    ],
    currentPlayer: 1,
    turn: 1,
    phase: 'playing',
    winner: null,
    roomId: uuidv4(),
    chainReactions: [],
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  if (state.phase !== 'playing') return state;
  
  let newState = deepCloneState(state);
  const player = getPlayer(newState, action.playerId);
  
  if (!player || action.playerId !== state.currentPlayer) return state;
  
  switch (action.type) {
    case 'place':
      newState = handlePlaceAction(newState, action, player);
      break;
    case 'upgrade':
      newState = handleUpgradeAction(newState, action, player);
      break;
    case 'skip':
      break;
  }
  
  return newState;
}

function handlePlaceAction(
  state: GameState,
  action: PlaceAction,
  player: { id: PlayerId; name: string; energy: number }
): GameState {
  if (player.energy < PLACE_COST) return state;
  
  const cell = findCell(state.map, action.coord);
  if (!cell) return state;
  
  if (cell.tower !== null) return state;
  if (cell.owner !== action.playerId) return state;
  
  const newTower: Tower = {
    type: action.towerType,
    level: 1,
    owner: action.playerId,
    cooldown: 0,
    slowed: false,
    lastActionTurn: 0,
  };
  
  cell.tower = newTower;
  cell.animation = {
    type: 'place',
    startTime: Date.now(),
    duration: 400,
  };
  
  player.energy -= PLACE_COST;
  
  addChainEvent(state, action.coord, 0);
  
  return state;
}

function handleUpgradeAction(
  state: GameState,
  action: UpgradeAction,
  player: { id: PlayerId; name: string; energy: number }
): GameState {
  if (player.energy < UPGRADE_COST) return state;
  
  const cell = findCell(state.map, action.coord);
  if (!cell || !cell.tower) return state;
  if (cell.tower.owner !== action.playerId) return state;
  if (cell.tower.level >= MAX_TOWER_LEVEL) return state;
  
  cell.tower.level = (cell.tower.level + 1) as 1 | 2 | 3;
  cell.animation = {
    type: 'upgrade',
    startTime: Date.now(),
    duration: 450,
  };
  
  player.energy -= UPGRADE_COST;
  
  addChainEvent(state, action.coord, 0);
  
  return state;
}

function addChainEvent(state: GameState, coord: HexCoord, delay: number): void {
  const event: ChainReactionEvent = {
    coord,
    startTime: Date.now() + delay,
  };
  state.chainReactions.push(event);
}

export function endTurn(state: GameState): GameState {
  const newState = deepCloneState(state);
  newState.chainReactions = [];
  
  const prevPlayer = newState.currentPlayer;
  newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;
  
  if (newState.currentPlayer === 1) {
    newState.turn++;
  }
  
  processTowerEffects(newState, prevPlayer);
  
  applyIceSlows(newState);
  
  const currentPlayerData = getPlayer(newState, newState.currentPlayer);
  if (currentPlayerData) {
    currentPlayerData.energy += ENERGY_PER_TURN;
  }
  
  const winResult = checkWin(newState);
  if (winResult) {
    newState.phase = 'ended';
    newState.winner = winResult;
  }
  
  return newState;
}

function processTowerEffects(state: GameState, actingPlayerId: PlayerId): void {
  const activeTowers = state.map.filter(c => c.tower && c.tower.owner === actingPlayerId);
  
  let delay = 0;
  const delayIncrement = 100;
  
  for (const cell of activeTowers) {
    if (!cell.tower) continue;
    
    const tower = cell.tower;
    const actionInterval = tower.slowed ? 2 : 1;
    
    if (state.turn - tower.lastActionTurn < actionInterval) continue;
    
    tower.lastActionTurn = state.turn;
    
    addChainEvent(state, cell.coord, delay);
    delay += delayIncrement;
    
    const adjacentCoords = getAdjacentHexes(cell.coord);
    const adjacentCells = adjacentCoords
      .map(c => findCell(state.map, c))
      .filter((c): c is HexCell => c !== undefined);
    
    const chainBonus = calculateChainBonus(state, cell);
    
    switch (tower.type) {
      case 'fire':
        processFireTower(state, cell, tower, adjacentCells, chainBonus, delay);
        delay += delayIncrement * adjacentCells.length;
        break;
      case 'ice':
        processIceTower(tower, adjacentCells);
        break;
      case 'electric':
        delay = processElectricTower(state, cell, tower, delay);
        break;
    }
  }
}

function calculateChainBonus(state: GameState, cell: HexCell): number {
  if (!cell.tower) return 0;
  
  const adjacentCoords = getAdjacentHexes(cell.coord);
  const adjacentCells = adjacentCoords
    .map(c => findCell(state.map, c))
    .filter((c): c is HexCell => c !== undefined);
  
  let bonus = 0;
  for (const adj of adjacentCells) {
    if (adj.tower && adj.tower.owner === cell.tower.owner) {
      if (adj.tower.type === cell.tower.type) {
        bonus += adj.tower.level;
      }
    }
  }
  
  return bonus;
}

function processFireTower(
  state: GameState,
  _sourceCell: HexCell,
  tower: Tower,
  adjacentCells: HexCell[],
  chainBonus: number,
  startDelay: number
): void {
  const baseDamage = 2;
  const damage = baseDamage + chainBonus;
  
  if (damage <= 0) return;
  
  let delay = startDelay;
  const delayIncrement = 100;
  
  for (const cell of adjacentCells) {
    addChainEvent(state, cell.coord, delay);
    delay += delayIncrement;
    
    if (cell.tower && cell.tower.owner !== tower.owner) {
      if (cell.tower.level <= damage) {
        cell.tower = null;
        cell.owner = tower.owner;
      } else {
        cell.tower.level = (cell.tower.level - damage) as 1 | 2 | 3;
      }
    } else if (cell.owner !== tower.owner) {
      cell.owner = tower.owner;
    }
  }
}

function processIceTower(
  tower: Tower,
  adjacentCells: HexCell[]
): void {
  for (const cell of adjacentCells) {
    if (cell.tower && cell.tower.owner !== tower.owner) {
      cell.tower.slowed = true;
    }
  }
}

function applyIceSlows(state: GameState): void {
  const activeIceTowers = state.map.filter(c => c.tower && c.tower.type === 'ice');
  const slowedEnemyCells = new Set<string>();
  
  for (const cell of activeIceTowers) {
    if (!cell.tower) continue;
    
    const adjacentCoords = getAdjacentHexes(cell.coord);
    for (const adjCoord of adjacentCoords) {
      const adjCell = findCell(state.map, adjCoord);
      if (adjCell?.tower && adjCell.tower.owner !== cell.tower.owner) {
        slowedEnemyCells.add(`${adjCoord.q},${adjCoord.r}`);
      }
    }
  }
  
  for (const cell of state.map) {
    if (cell.tower) {
      const key = `${cell.coord.q},${cell.coord.r}`;
      if (slowedEnemyCells.has(key)) {
        cell.tower.slowed = true;
      } else {
        cell.tower.slowed = false;
      }
    }
  }
}

function processElectricTower(
  state: GameState,
  sourceCell: HexCell,
  tower: Tower,
  startDelay: number
): number {
  tower.cooldown = (tower.cooldown || 0) + 1;
  
  if (tower.cooldown < ELECTRIC_COOLDOWN) {
    return startDelay;
  }
  
  tower.cooldown = 0;
  
  let delay = startDelay;
  const visited = new Set<string>();
  const queue: { coord: HexCoord; level: number; currentDelay: number }[] = [];
  
  queue.push({ coord: sourceCell.coord, level: tower.level, currentDelay: delay });
  visited.add(`${sourceCell.coord.q},${sourceCell.coord.r}`);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentSourceCell = findCell(state.map, current.coord);
    if (!currentSourceCell?.tower) continue;
    
    const damage = current.level;
    
    const targets = state.map.filter(c => {
      const key = `${c.coord.q},${c.coord.r}`;
      if (visited.has(key)) return false;
      if (!c.tower) return false;
      if (c.tower.owner === currentSourceCell.tower!.owner) return false;
      const dist = getHexDistance(current.coord, c.coord);
      return dist > 0 && dist <= 2;
    });
    
    if (targets.length === 0) continue;
    
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];
    const targetKey = `${randomTarget.coord.q},${randomTarget.coord.r}`;
    visited.add(targetKey);
    
    delay = current.currentDelay + 100;
    addChainEvent(state, randomTarget.coord, delay);
    
    if (randomTarget.tower!.level <= damage) {
      randomTarget.tower = null;
      randomTarget.owner = currentSourceCell.tower!.owner;
    } else {
      randomTarget.tower!.level = (randomTarget.tower!.level - damage) as 1 | 2 | 3;
      
      if (randomTarget.tower!.type === 'electric') {
        queue.push({
          coord: randomTarget.coord,
          level: randomTarget.tower!.level,
          currentDelay: delay,
        });
      }
    }
  }
  
  return delay;
}

export function checkWin(state: GameState): PlayerId | 'draw' | null {
  if (state.turn > MAX_TURNS) {
    return calculateWinnerByTerritory(state);
  }
  
  const player1Cells = state.map.filter(c => c.owner === 1).length;
  const player2Cells = state.map.filter(c => c.owner === 2).length;
  
  if (player1Cells === 0) return 2;
  if (player2Cells === 0) return 1;
  
  const currentPlayer = getPlayer(state, state.currentPlayer);
  if (currentPlayer && currentPlayer.energy < PLACE_COST && !canUpgradeAnyTower(state, state.currentPlayer)) {
    const otherPlayer = state.currentPlayer === 1 ? 2 : 1;
    const otherPlayerData = getPlayer(state, otherPlayer);
    if (otherPlayerData && otherPlayerData.energy < PLACE_COST && !canUpgradeAnyTower(state, otherPlayer)) {
      return calculateWinnerByTerritory(state);
    }
  }
  
  return null;
}

function calculateWinnerByTerritory(state: GameState): PlayerId | 'draw' {
  const player1Cells = state.map.filter(c => c.owner === 1).length;
  const player2Cells = state.map.filter(c => c.owner === 2).length;
  
  if (player1Cells > player2Cells) return 1;
  if (player2Cells > player1Cells) return 2;
  return 'draw';
}

function canUpgradeAnyTower(state: GameState, playerId: PlayerId): boolean {
  return state.map.some(
    c => c.tower && c.tower.owner === playerId && c.tower.level < MAX_TOWER_LEVEL
  );
}

export function calculateTerritoryPercentages(state: GameState): { p1: number; p2: number } {
  const totalCells = state.map.length;
  const player1Cells = state.map.filter(c => c.owner === 1).length;
  const player2Cells = state.map.filter(c => c.owner === 2).length;
  
  return {
    p1: Math.round((player1Cells / totalCells) * 100),
    p2: Math.round((player2Cells / totalCells) * 100),
  };
}

export function countTowersByType(state: GameState, playerId: PlayerId): { fire: number; ice: number; electric: number } {
  const playerTowers = state.map.filter(c => c.tower && c.tower.owner === playerId);
  
  return {
    fire: playerTowers.filter(c => c.tower?.type === 'fire').length,
    ice: playerTowers.filter(c => c.tower?.type === 'ice').length,
    electric: playerTowers.filter(c => c.tower?.type === 'electric').length,
  };
}

export function getPlayer(state: GameState, playerId: PlayerId) {
  return state.players.find(p => p.id === playerId);
}

export function canPlaceTower(state: GameState, coord: HexCoord, playerId: PlayerId): boolean {
  const cell = findCell(state.map, coord);
  const player = getPlayer(state, playerId);
  
  if (!cell || !player) return false;
  if (cell.owner !== playerId) return false;
  if (cell.tower !== null) return false;
  if (player.energy < PLACE_COST) return false;
  
  return true;
}

export function canUpgradeTower(state: GameState, coord: HexCoord, playerId: PlayerId): boolean {
  const cell = findCell(state.map, coord);
  const player = getPlayer(state, playerId);
  
  if (!cell || !player) return false;
  if (!cell.tower || cell.tower.owner !== playerId) return false;
  if (cell.tower.level >= MAX_TOWER_LEVEL) return false;
  if (player.energy < UPGRADE_COST) return false;
  
  return true;
}

export function getPlaceableCells(state: GameState, playerId: PlayerId): HexCoord[] {
  return state.map
    .filter(cell => canPlaceTower(state, cell.coord, playerId))
    .map(cell => cell.coord);
}

function deepCloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

export { PLACE_COST, UPGRADE_COST, MAX_TOWER_LEVEL, MAX_TURNS };
