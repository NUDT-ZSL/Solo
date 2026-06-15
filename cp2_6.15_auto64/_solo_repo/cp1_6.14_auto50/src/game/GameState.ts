import { GameData, Item, Player, Room, GameStatus } from '../types';
import {
  PLAYER_MAX_HP,
  PLAYER_INITIAL_ATTACK,
  PLAYER_SPEED,
  PLAYER_RADIUS,
} from '../constants';

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `id_${idCounter}`;
}

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    attack: PLAYER_INITIAL_ATTACK,
    gold: 0,
    speed: PLAYER_SPEED,
    inventory: [],
    radius: PLAYER_RADIUS,
  };
}

export function createInitialGameData(seed?: number): GameData {
  const s = seed ?? Math.floor(Math.random() * 2147483647);
  return {
    status: 'playing',
    player: createPlayer(0, 0),
    currentRoomId: 0,
    rooms: [],
    seed: s,
    unlockedItems: [],
    frameCount: 0,
    transitionAlpha: 1,
    damageFlash: 0,
  };
}

export function getCurrentRoom(data: GameData): Room | undefined {
  return data.rooms.find((r) => r.id === data.currentRoomId);
}

export function addRoom(data: GameData, room: Room): GameData {
  return {
    ...data,
    rooms: [...data.rooms, room],
  };
}

export function updateRoom(data: GameData, updatedRoom: Room): GameData {
  return {
    ...data,
    rooms: data.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
  };
}

export function updatePlayer(data: GameData, partial: Partial<Player>): GameData {
  return {
    ...data,
    player: { ...data.player, ...partial },
  };
}

export function setGameStatus(data: GameData, status: GameStatus): GameData {
  return { ...data, status };
}

export function applyItemToPlayer(player: Player, item: Item): Player {
  switch (item.type) {
    case 'heal':
      return {
        ...player,
        hp: Math.min(player.maxHp, player.hp + item.value),
        inventory: [...player.inventory, item],
      };
    case 'attack':
      return {
        ...player,
        attack: player.attack + item.value,
        inventory: [...player.inventory, item],
      };
    case 'gold':
      return {
        ...player,
        gold: player.gold + item.value,
        inventory: [...player.inventory, item],
      };
    default:
      return player;
  }
}

export function resetGame(data: GameData): GameData {
  const newSeed = Math.floor(Math.random() * 2147483647);
  const newPlayer = createPlayer(0, 0);
  for (const item of data.unlockedItems) {
    if (item.type === 'attack') {
      newPlayer.attack += item.value;
    }
  }
  return {
    status: 'playing',
    player: newPlayer,
    currentRoomId: 0,
    rooms: [],
    seed: newSeed,
    unlockedItems: [...data.unlockedItems],
    frameCount: 0,
    transitionAlpha: 1,
    damageFlash: 0,
  };
}

export { nextId };
