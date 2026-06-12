import {
  GameState,
  GameAction,
  PlaceAction,
  UpgradeAction,
  SkipAction,
  HexCell,
  Tower,
  TowerType,
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
      newState = handleSkipAction(newState, player);
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
  
  return processChainReactions(state, action.coord);
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
  
  return processChainReactions(state, action.coord);
}

function handleSkipAction(
  state: GameState,
  _player: { id: PlayerId; name: string; energy: number }
): GameState {
  return state;
}

function processChainReactions(state: GameState, triggerCoord: HexCoord): GameState {
  const chainEvents: ChainReactionEvent[] = [];
  const processedCells = new Set<string>();
  
  function coordKey(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
  }
  
  function processCell(coord: HexCoord, delay: number) {
    const key = coordKey(coord);
    if (processedCells.has(key)) return;
    processedCells.add(key);
    
    const cell = findCell(state.map, coord);
    if (!cell || !cell.tower) return;
    
    chainEvents.push({
      coord,
      startTime: Date.now() + delay,
    });
    
    const adjacentCoords = getAdjacentHexes(coord);
    const adjacentCells = adjacentCoords
      .map(c => findCell(state.map, c))
      .filter((c): c is HexCell => c !== undefined);
    
    applyTowerEffects(state, cell, adjacentCells);
    
    if (cell.tower?.type === 'electric') {
      const electricTargets = state.map.filter(
        c => c.tower &&
        c.tower.owner !== cell.tower!.owner &&
        getHexDistance(coord, c.coord) <= 2 &&
        getHexDistance(coord, c.coord) > 0
      );
      
      if (electricTargets.length > 0 && state.turn % 3 === 0) {
        const randomTarget = electricTargets[Math.floor(Math.random() * electricTargets.length)];
        applyElectricDamage(state, cell, randomTarget);
        processCell(randomTarget.coord, delay + 100);
      }
    }
  }
  
  processCell(triggerCoord, 0);
  
  state.chainReactions = chainEvents;
  
  return state;
}

function applyTowerEffects(
  state: GameState,
  sourceCell: HexCell,
  adjacentCells: HexCell[]
): void {
  const tower = sourceCell.tower;
  if (!tower) return;
  
  const currentTurn = state.turn;
  const actionInterval = tower.slowed ? 2 : 1;
  
  if (currentTurn - tower.lastActionTurn < actionInterval) return;
  
  tower.lastActionTurn = currentTurn;
  
  const chainBonus = calculateChainBonus(state, sourceCell);
  
  switch (tower.type) {
    case 'fire':
      applyFireEffect(state, tower, adjacentCells, chainBonus);
      break;
    case 'ice':
      applyIceEffect(adjacentCells, tower.owner);
      break;
    case 'electric':
      break;
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

function applyFireEffect(
  _state: GameState,
  tower: Tower,
  adjacentCells: HexCell[],
  chainBonus: number
): void {
  const baseDamage = 2;
  const damage = baseDamage + chainBonus;
  
  for (const cell of adjacentCells) {
    if (cell.owner !== null && cell.owner !== tower.owner) {
      cell.owner = tower.owner;
      if (cell.tower && cell.tower.owner !== tower.owner) {
        cell.tower = null;
      }
    } else if (cell.owner === null && damage > 0) {
      cell.owner = tower.owner;
    }
  }
}

function applyIceEffect(adjacentCells: HexCell[], owner: PlayerId): void {
  for (const cell of adjacentCells) {
    if (cell.tower && cell.tower.owner !== owner) {
      cell.tower.slowed = true;
    }
  }
}

function applyElectricDamage(
  state: GameState,
  sourceCell: HexCell,
  targetCell: HexCell
): void {
  if (!sourceCell.tower || !targetCell.tower) return;
  
  const damage = sourceCell.tower.level;
  
  if (targetCell.tower.level <= damage) {
    targetCell.tower = null;
    targetCell.owner = sourceCell.tower.owner;
  } else {
    targetCell.tower.level = (targetCell.tower.level - damage) as 1 | 2 | 3;
  }
  
  state.chainReactions.push({
    coord: targetCell.coord,
    startTime: Date.now() + 100,
  });
}

export function endTurn(state: GameState): GameState {
  const newState = deepCloneState(state);
  
  newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;
  
  if (newState.currentPlayer === 1) {
    newState.turn++;
  }
  
  const currentPlayerData = getPlayer(newState, newState.currentPlayer);
  if (currentPlayerData) {
    currentPlayerData.energy += ENERGY_PER_TURN;
  }
  
  const winResult = checkWin(newState);
  if (winResult) {
    newState.phase = 'ended';
    newState.winner = winResult;
  }
  
  newState.chainReactions = [];
  
  return newState;
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
