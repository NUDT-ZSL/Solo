import { Room, RoomType, Player, Monster, Item, GameState, ITEM_POOL, NORMAL_MONSTERS, ELITE_MONSTERS, ROOM_DESCRIPTIONS } from './types';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomItems(arr: Item[], count: number): Item[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateRooms(): Room[][] {
  const rooms: Room[][] = [];
  for (let y = 0; y < 3; y++) {
    const row: Room[] = [];
    for (let x = 0; x < 3; x++) {
      const types: RoomType[] = [RoomType.NormalMonster, RoomType.NormalMonster, RoomType.EliteMonster, RoomType.Treasure];
      const type = pickRandom(types);
      let monster: Monster | undefined;
      let treasures: Item[] | undefined;
      let eventText: string;

      if (type === RoomType.NormalMonster) {
        const baseMonster = pickRandom(NORMAL_MONSTERS);
        monster = { ...baseMonster, hp: baseMonster.maxHp };
        eventText = `遭遇了${monster.name}！准备战斗！`;
      } else if (type === RoomType.EliteMonster) {
        const baseMonster = pickRandom(ELITE_MONSTERS);
        monster = { ...baseMonster, hp: baseMonster.maxHp };
        eventText = `精英怪物${monster.name}出现了！这将是一场恶战！`;
      } else {
        treasures = pickRandomItems(ITEM_POOL, randomInt(1, 3));
        eventText = `你发现了一个宝物房间！`;
      }

      const descriptions = ROOM_DESCRIPTIONS[type];
      const description = pickRandom(descriptions);

      row.push({
        x,
        y,
        type,
        monster,
        treasures,
        visited: false,
        cleared: false,
        eventText,
        description,
      });
    }
    rooms.push(row);
  }

  rooms[0][0].visited = true;
  rooms[0][0].cleared = true;
  rooms[0][0].eventText = '你站在地下城的入口。';
  rooms[0][0].description = '地下城的入口处，火把的光芒驱散了些许黑暗，前方的走廊通向未知的深处。';
  return rooms;
}

export function createInitialPlayer(): Player {
  return {
    hp: 5,
    maxHp: 5,
    gold: 0,
    inventory: [],
    position: { x: 0, y: 0 },
  };
}

export function createInitialState(): GameState {
  return {
    rooms: generateRooms(),
    player: createInitialPlayer(),
    currentEvent: null,
    currentRoom: null,
    inBattle: false,
    battleLog: [],
    gameOver: false,
    inventoryOpen: false,
    transitioning: false,
  };
}

export function canMoveTo(player: Player, x: number, y: number): boolean {
  const dx = Math.abs(player.position.x - x);
  const dy = Math.abs(player.position.y - y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

export function movePlayer(state: GameState, x: number, y: number): GameState {
  if (!canMoveTo(state.player, x, y) || state.gameOver || state.transitioning) {
    return state;
  }

  const newRooms = state.rooms.map(row => row.map(room => ({ ...room })));
  const room = newRooms[y][x];
  room.visited = true;

  return {
    ...state,
    rooms: newRooms,
    player: {
      ...state.player,
      position: { x, y },
    },
    currentRoom: room,
    currentEvent: room.cleared ? '这个房间已经探索过了。' : room.eventText,
    transitioning: true,
  };
}

export function finishTransition(state: GameState): GameState {
  return { ...state, transitioning: false };
}

export function triggerRoomEvent(state: GameState): GameState {
  const room = state.currentRoom;
  if (!room || room.cleared) {
    return { ...state, currentEvent: null };
  }

  if (room.type === RoomType.Treasure) {
    return handleTreasureRoom(state, room);
  }

  return {
    ...state,
    inBattle: room.type !== RoomType.Treasure,
  };
}

function handleTreasureRoom(state: GameState, room: Room): GameState {
  const treasures = room.treasures || [];
  const gold = randomInt(10, 50);
  const newRooms = state.rooms.map(row => row.map(r => {
    if (r.x === room.x && r.y === room.y) {
      return { ...r, cleared: true };
    }
    return r;
  }));

  return {
    ...state,
    rooms: newRooms,
    player: {
      ...state.player,
      gold: state.player.gold + gold,
      inventory: [...state.player.inventory, ...treasures],
    },
    currentEvent: `获得了 ${treasures.map(t => t.name).join('、')} 和 ${gold} 金币！`,
  };
}

export interface BattleResult {
  playerDamage: number;
  monsterDamage: number;
  monsterHp: number;
  playerHp: number;
  monsterDead: boolean;
  playerDead: boolean;
  log: string;
}

export function playerAttack(monster: Monster): BattleResult {
  const playerDamage = randomInt(10, 20);
  const newMonsterHp = Math.max(0, monster.hp - playerDamage);
  const monsterDead = newMonsterHp <= 0;
  let monsterDamage = 0;
  let playerHp = 0;
  let log = `玩家对${monster.name}造成了 ${playerDamage} 点伤害！`;

  if (!monsterDead) {
    monsterDamage = randomInt(5, 15);
    log += ` ${monster.name}反击造成了 ${monsterDamage} 点伤害！`;
  } else {
    log += ` ${monster.name}被击败了！`;
  }

  return {
    playerDamage,
    monsterDamage,
    monsterHp: newMonsterHp,
    playerHp,
    monsterDead,
    playerDead: false,
    log,
  };
}

export function applyBattleResult(state: GameState, result: BattleResult): GameState {
  const room = state.currentRoom;
  if (!room || !room.monster) return state;

  const newMonsterHp = result.monsterHp;
  const newPlayerHp = Math.max(0, state.player.hp - result.monsterDamage);
  const playerDead = newPlayerHp <= 0;

  let newRooms = state.rooms.map(row => row.map(r => ({ ...r })));
  let newState = { ...state };

  if (result.monsterDead) {
    const gold = randomInt(20, 80);
    const lootItems = room.monster.loot
      .map(id => ITEM_POOL.find(item => item.id === id))
      .filter((item): item is Item => item !== undefined);

    newRooms[room.y][room.x] = {
      ...newRooms[room.y][room.x],
      cleared: true,
      monster: { ...room.monster, hp: 0 },
    };

    newState = {
      ...newState,
      rooms: newRooms,
      player: {
        ...state.player,
        hp: newPlayerHp,
        gold: state.player.gold + gold,
        inventory: [...state.player.inventory, ...lootItems],
      },
      inBattle: false,
      battleLog: [...state.battleLog, result.log, `战斗胜利！获得 ${gold} 金币和 ${lootItems.map(i => i.name).join('、') || '无宝物'}！`],
      currentEvent: `战斗胜利！获得 ${gold} 金币和 ${lootItems.map(i => i.name).join('、') || '无宝物'}！`,
    };
  } else if (playerDead) {
    newState = {
      ...newState,
      player: {
        ...state.player,
        hp: 0,
      },
      inBattle: false,
      gameOver: true,
      battleLog: [...state.battleLog, result.log, '你被击败了...'],
    };
  } else {
    newRooms[room.y][room.x] = {
      ...newRooms[room.y][room.x],
      monster: { ...room.monster, hp: newMonsterHp },
    };
    newState = {
      ...newState,
      rooms: newRooms,
      player: {
        ...state.player,
        hp: newPlayerHp,
      },
      battleLog: [...state.battleLog, result.log],
    };
  }

  return newState;
}

export function closeEventModal(state: GameState): GameState {
  return { ...state, currentEvent: null };
}

export function toggleInventory(state: GameState): GameState {
  return { ...state, inventoryOpen: !state.inventoryOpen };
}

export function useItem(state: GameState, itemId: string): GameState {
  const itemIndex = state.player.inventory.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return state;

  const item = state.player.inventory[itemIndex];
  const newInventory = [...state.player.inventory];
  newInventory.splice(itemIndex, 1);

  let newHp = state.player.hp;
  if (item.type === 'potion') {
    newHp = Math.min(state.player.maxHp, state.player.hp + 1);
  }

  return {
    ...state,
    player: {
      ...state.player,
      hp: newHp,
      inventory: newInventory,
    },
  };
}

export function restartGame(): GameState {
  return createInitialState();
}
