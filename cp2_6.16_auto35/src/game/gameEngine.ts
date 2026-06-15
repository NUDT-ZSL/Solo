import {
  GameState,
  GamePhase,
  Position,
  TileType,
  Player,
  Monster,
  Equipment,
  EquipmentType,
  FloatingText,
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_INITIAL_HP,
  PLAYER_INITIAL_ATTACK,
  PLAYER_INITIAL_DEFENSE,
  MONSTER_HP,
  MONSTER_ATTACK,
  MONSTER_COUNT,
  EQUIPMENT_COUNT,
  BOSS_HP,
  BOSS_ATTACK,
} from './types';
import { generateDungeon, generateBossMap, GeneratedMap } from './mapGenerator';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isWalkable(tile: TileType): boolean {
  return (
    tile === TileType.ROOM ||
    tile === TileType.CORRIDOR ||
    tile === TileType.ENTRANCE ||
    tile === TileType.EXIT
  );
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function isAdjacent(a: Position, b: Position): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function getRandomRoomFloorPosition(
  map: TileType[][],
  rooms: { x: number; y: number; width: number; height: number }[],
  excludePositions: Position[] = [],
  cornerBias = false
): Position | null {
  const candidates: Position[] = [];

  for (const room of rooms) {
    const positions: Position[] = [];

    if (cornerBias && room.width >= 3 && room.height >= 3) {
      const corners = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.width - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.height - 2 },
        { x: room.x + room.width - 2, y: room.y + room.height - 2 },
      ];
      for (const c of corners) {
        if (
          isWalkable(map[c.y]?.[c.x]) &&
          !excludePositions.some((p) => positionsEqual(p, c))
        ) {
          positions.push(c);
        }
      }
    }

    if (positions.length === 0) {
      for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
          if (
            isWalkable(map[y]?.[x]) &&
            !excludePositions.some((p) => positionsEqual(p, { x, y }))
          ) {
            positions.push({ x, y });
          }
        }
      }
    }

    candidates.push(...positions);
  }

  if (candidates.length === 0) return null;
  return candidates[randomInt(0, candidates.length - 1)];
}

function createPlayer(position: Position): Player {
  return {
    position: { ...position },
    displayPosition: { x: position.x, y: position.y },
    hp: PLAYER_INITIAL_HP,
    maxHp: PLAYER_INITIAL_HP,
    attack: PLAYER_INITIAL_ATTACK,
    defense: PLAYER_INITIAL_DEFENSE,
  };
}

function createMonster(position: Position, isBoss = false): Monster {
  if (isBoss) {
    return {
      id: generateId(),
      position: { ...position },
      displayPosition: { x: position.x, y: position.y },
      hp: BOSS_HP,
      maxHp: BOSS_HP,
      attack: BOSS_ATTACK,
      isBoss: true,
      isBlinking: false,
    };
  }
  return {
    id: generateId(),
    position: { ...position },
    displayPosition: { x: position.x, y: position.y },
    hp: MONSTER_HP,
    maxHp: MONSTER_HP,
    attack: MONSTER_ATTACK,
    isBoss: false,
    isBlinking: false,
  };
}

function createEquipment(position: Position): Equipment {
  const types: EquipmentType[] = [
    EquipmentType.ATTACK,
    EquipmentType.HEAL,
    EquipmentType.DEFENSE,
  ];
  const type = types[randomInt(0, types.length - 1)];

  let value = 0;
  let name = '';
  let displayName = '';

  switch (type) {
    case EquipmentType.ATTACK:
      value = 2;
      name = 'attack_boost';
      displayName = `+${value} ATK`;
      break;
    case EquipmentType.HEAL:
      value = 5;
      name = 'health_potion';
      displayName = `+${value} HP`;
      break;
    case EquipmentType.DEFENSE:
      value = 1;
      name = 'defense_boost';
      displayName = `+${value} DEF`;
      break;
  }

  return {
    id: generateId(),
    position: { ...position },
    type,
    value,
    name,
    displayName,
  };
}

function createFloatingText(
  x: number,
  y: number,
  text: string,
  color: string,
  duration = 1200
): FloatingText {
  return {
    id: generateId(),
    worldX: x,
    worldY: y,
    text,
    color,
    createdAt: Date.now(),
    duration,
  };
}

export function createInitialState(): GameState {
  const gen = generateDungeon();
  return buildStateFromMap(gen, GamePhase.EXPLORING, 1);
}

function buildStateFromMap(
  gen: GeneratedMap,
  phase: GamePhase,
  floor: number
): GameState {
  const { map, rooms, entrance } = gen;
  const player = createPlayer(entrance);
  const usedPositions: Position[] = [{ ...entrance }];

  const monsters: Monster[] = [];
  const equipments: Equipment[] = [];

  if (phase === GamePhase.BOSS) {
    if (rooms.length > 0) {
      const room = rooms[0];
      const bossPos: Position = {
        x: Math.floor(room.x + room.width / 2),
        y: room.y + 2,
      };
      monsters.push(createMonster(bossPos, true));
    }
  } else {
    for (let i = 0; i < MONSTER_COUNT; i++) {
      const pos = getRandomRoomFloorPosition(map, rooms, usedPositions);
      if (pos) {
        monsters.push(createMonster(pos));
        usedPositions.push({ ...pos });
      }
    }

    for (let i = 0; i < EQUIPMENT_COUNT; i++) {
      const pos = getRandomRoomFloorPosition(map, rooms, usedPositions, true);
      if (pos) {
        equipments.push(createEquipment(pos));
        usedPositions.push({ ...pos });
      }
    }
  }

  return {
    phase,
    floor,
    map,
    rooms,
    player,
    monsters,
    equipments,
    inventory: [],
    floatingTexts: [],
    isShaking: false,
    isBossSpecialAttack: false,
    bossTurnCount: 0,
    playerBlinking: false,
  };
}

export function enterBossState(prevState: GameState): GameState {
  const gen = generateBossMap();
  const newState = buildStateFromMap(gen, GamePhase.BOSS, 2);
  newState.player.hp = prevState.player.hp;
  newState.player.maxHp = prevState.player.maxHp;
  newState.player.attack = prevState.player.attack;
  newState.player.defense = prevState.player.defense;
  newState.inventory = [...prevState.inventory];
  return newState;
}

export function tryMovePlayer(state: GameState, dx: number, dy: number): GameState {
  if (
    state.phase !== GamePhase.EXPLORING &&
    state.phase !== GamePhase.BOSS
  ) {
    return state;
  }

  const newX = state.player.position.x + dx;
  const newY = state.player.position.y + dy;

  if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
    return state;
  }

  const tile = state.map[newY][newX];
  if (!isWalkable(tile)) {
    return state;
  }

  const adjacentMonster = state.monsters.find(
    (m) => m.hp > 0 && isAdjacent(state.player.position, m.position)
  );

  const monsterAtTarget = state.monsters.find(
    (m) => m.hp > 0 && m.position.x === newX && m.position.y === newY
  );

  let workingState = { ...state };

  if (adjacentMonster || monsterAtTarget) {
    const monster = adjacentMonster || monsterAtTarget!;
    workingState = processBattle(workingState, monster.id);
    return workingState;
  }

  workingState = {
    ...workingState,
    player: {
      ...workingState.player,
      position: { x: newX, y: newY },
      displayPosition: { x: newX, y: newY },
    },
  };

  const equipmentIndex = workingState.equipments.findIndex(
    (e) => e.position.x === newX && e.position.y === newY
  );

  if (equipmentIndex !== -1) {
    const equip = workingState.equipments[equipmentIndex];
    workingState = applyEquipmentEffect(workingState, equip);
    const newEquipments = [...workingState.equipments];
    newEquipments.splice(equipmentIndex, 1);
    workingState = {
      ...workingState,
      equipments: newEquipments,
      inventory: [...workingState.inventory, equip],
    };
  }

  if (tile === TileType.EXIT && workingState.phase === GamePhase.EXPLORING) {
    workingState = enterBossState(workingState);
    return workingState;
  }

  return workingState;
}

function processBattle(state: GameState, monsterId: string): GameState {
  const monsterIndex = state.monsters.findIndex((m) => m.id === monsterId);
  if (monsterIndex === -1) return state;

  let player = { ...state.player };
  const monsters = state.monsters.map((m) => ({ ...m }));
  const monster = monsters[monsterIndex];
  let floatingTexts = [...state.floatingTexts];
  let isShaking = true;
  let isBossSpecialAttack = false;
  let bossTurnCount = state.bossTurnCount;
  let phase = state.phase;

  const playerDamage = player.attack;
  monster.hp -= playerDamage;
  monster.isBlinking = true;

  floatingTexts.push(
    createFloatingText(
      monster.position.x,
      monster.position.y,
      `-${playerDamage}`,
      '#ff2222',
      1200
    )
  );

  if (monster.hp <= 0) {
    if (monster.isBoss) {
      phase = GamePhase.VICTORY;
      floatingTexts.push(
        createFloatingText(
          monster.position.x,
          monster.position.y - 1,
          '击败!',
          '#ffd700',
          2000
        )
      );
    }
  } else {
    let monsterDamage = monster.attack;

    if (monster.isBoss) {
      bossTurnCount += 1;
      if (bossTurnCount % 3 === 0) {
        monsterDamage *= 2;
        isBossSpecialAttack = true;
        floatingTexts.push(
          createFloatingText(
            monster.position.x,
            monster.position.y - 1,
            '暴怒!',
            '#ff0000',
            1500
          )
        );
      }
    }

    const actualDamage = Math.max(1, monsterDamage - player.defense);
    player.hp -= actualDamage;

    floatingTexts.push(
      createFloatingText(
        player.position.x,
        player.position.y,
        `-${actualDamage}`,
        '#ff1111',
        1200
      )
    );

    if (player.hp <= 0) {
      player.hp = 0;
      phase = GamePhase.GAME_OVER;
    }
  }

  return {
    ...state,
    phase,
    player,
    monsters,
    floatingTexts,
    isShaking,
    isBossSpecialAttack,
    bossTurnCount,
  };
}

function applyEquipmentEffect(
  state: GameState,
  equipment: Equipment
): GameState {
  const player = { ...state.player };
  const floatingTexts = [...state.floatingTexts];

  switch (equipment.type) {
    case EquipmentType.ATTACK:
      player.attack += equipment.value;
      floatingTexts.push(
        createFloatingText(
          player.position.x,
          player.position.y,
          `+${equipment.value} ATK`,
          '#00ff66',
          1800
        )
      );
      break;
    case EquipmentType.HEAL:
      player.hp = Math.min(player.maxHp, player.hp + equipment.value);
      floatingTexts.push(
        createFloatingText(
          player.position.x,
          player.position.y,
          `+${equipment.value} HP`,
          '#00ff88',
          1800
        )
      );
      break;
    case EquipmentType.DEFENSE:
      player.defense += equipment.value;
      floatingTexts.push(
        createFloatingText(
          player.position.x,
          player.position.y,
          `+${equipment.value} DEF`,
          '#22ffaa',
          1800
        )
      );
      break;
  }

  return {
    ...state,
    player,
    floatingTexts,
  };
}

export function cleanupFloatingTexts(state: GameState): GameState {
  const now = Date.now();
  const filtered = state.floatingTexts.filter(
    (t) => now - t.createdAt < t.duration
  );
  if (filtered.length === state.floatingTexts.length) return state;
  return { ...state, floatingTexts: filtered };
}

export function clearEffects(state: GameState): GameState {
  let changed = false;
  let newState = state;

  if (state.isShaking) {
    newState = { ...newState, isShaking: false };
    changed = true;
  }

  if (state.isBossSpecialAttack) {
    newState = { ...newState, isBossSpecialAttack: false };
    changed = true;
  }

  const monsters = state.monsters.map((m) => {
    if (m.isBlinking) {
      changed = true;
      return { ...m, isBlinking: false };
    }
    return m;
  });

  if (changed) {
    return { ...newState, monsters };
  }
  return state;
}
