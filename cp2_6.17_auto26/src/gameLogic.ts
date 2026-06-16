import {
  GameState,
  Direction,
  Coord,
  Rock,
  Companion,
  GameEvent,
  LevelData,
  GateTimer,
  MOVE_INTERVAL,
  GATE_DURATION,
  coordToKey,
  CoordKey,
  GRID_SIZE,
} from './gameTypes';
import { levels } from './levels';

const dirDelta: Record<Direction, Coord> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const addCoord = (a: Coord, b: Coord): Coord => ({ x: a.x + b.x, y: a.y + b.y });
const eqCoord = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;
const inBounds = (c: Coord): boolean => c.x >= 0 && c.x < GRID_SIZE && c.y >= 0 && c.y < GRID_SIZE;

const getGateCoordsForPlate = (level: LevelData, plate: Coord): Coord[] | undefined =>
  level.pressurePlateToGate.get(coordToKey(plate));

export const cloneLevelData = (data: LevelData): LevelData => {
  return {
    ...data,
    walls: data.walls.map((w) => ({ ...w })),
    traps: data.traps.map((t) => ({ ...t })),
    rocks: data.rocks.map((r) => ({ id: r.id, coord: { ...r.coord } })),
    pressurePlates: data.pressurePlates.map((p) => ({ ...p })),
    pressurePlateToGate: new Map(data.pressurePlateToGate),
    companions: data.companions.map((c) => ({ id: c.id, coord: { ...c.coord } })),
    exit: { ...data.exit },
    playerStart: { ...data.playerStart },
  };
};

export const createInitialState = (levelIndex: number, prevStartTime?: number): GameState => {
  const levelData = cloneLevelData(levels[levelIndex]);
  const companions: Companion[] = levelData.companions.map((c) => ({
    ...c,
    rescued: false,
  }));
  return {
    levelIndex,
    levelData,
    player: { coord: { ...levelData.playerStart } },
    rocks: levelData.rocks.map((r) => ({ id: r.id, coord: { ...r.coord } })),
    companions,
    removedGates: new Set<string>(),
    gateTimers: [],
    stepCount: 0,
    rescuedCount: 0,
    totalCompanions: companions.length,
    lastMoveTime: 0,
    trapFlashStart: 0,
    isFailed: false,
    isCleared: false,
    startTime: prevStartTime ?? Date.now(),
  };
};

const getWallSet = (state: GameState): Set<string> => {
  const set = new Set<string>();
  state.levelData.walls.forEach((w) => set.add(coordToKey(w)));
  state.gateTimers.forEach((gt) => {
    gt.gateCoords.forEach((gc) => set.delete(coordToKey(gc)));
  });
  return set;
};

const isWall = (state: GameState, coord: Coord): boolean => {
  const key = coordToKey(coord);
  const wallSet = getWallSet(state);
  return wallSet.has(key);
};

const findRockAt = (rocks: Rock[], coord: Coord): Rock | undefined =>
  rocks.find((r) => eqCoord(r.coord, coord));

const isTrap = (level: LevelData, coord: Coord): boolean =>
  level.traps.some((t) => eqCoord(t, coord));

const isPressurePlate = (level: LevelData, coord: Coord): boolean =>
  level.pressurePlates.some((p) => eqCoord(p, coord));

const isExit = (level: LevelData, coord: Coord): boolean => eqCoord(level.exit, coord);

const processGateTimers = (state: GameState, now: number): { state: GameState; events: GameEvent[] } => {
  const events: GameEvent[] = [];
  const newTimers: GateTimer[] = [];
  const newRemoved = new Set(state.removedGates);

  state.gateTimers.forEach((gt) => {
    const elapsed = now - gt.startTime;
    if (elapsed >= gt.duration) {
      gt.gateCoords.forEach((gc) => newRemoved.delete(coordToKey(gc)));
      events.push({ type: 'plateOff', payload: { plateCoord: gt.plateCoord } });
    } else {
      newTimers.push(gt);
    }
  });

  return {
    state: { ...state, gateTimers: newTimers, removedGates: newRemoved },
    events,
  };
};

const checkPlatesAndStartTimers = (state: GameState, now: number): { state: GameState; events: GameEvent[] } => {
  const events: GameEvent[] = [];
  let newTimers = [...state.gateTimers];
  const newRemoved = new Set(state.removedGates);
  const activePlates = new Set<string>();

  if (isPressurePlate(state.levelData, state.player.coord)) {
    activePlates.add(coordToKey(state.player.coord));
  }
  state.rocks.forEach((r) => {
    if (isPressurePlate(state.levelData, r.coord)) {
      activePlates.add(coordToKey(r.coord));
    }
  });

  state.levelData.pressurePlates.forEach((plate) => {
    const plateKey = coordToKey(plate);
    const gateCoords = getGateCoordsForPlate(state.levelData, plate);
    if (!gateCoords) return;

    const hasActive = activePlates.has(plateKey);
    const existingTimer = newTimers.find((t) => coordToKey(t.plateCoord) === plateKey);

    if (hasActive) {
      gateCoords.forEach((gc) => newRemoved.add(coordToKey(gc)));
      if (!existingTimer) {
        newTimers.push({
          plateCoord: { ...plate },
          gateCoords: gateCoords.map((g) => ({ ...g })),
          startTime: now,
          duration: GATE_DURATION,
        });
        events.push({ type: 'plateOn', payload: { plateCoord: plate } });
      }
    }
  });

  return {
    state: { ...state, gateTimers: newTimers, removedGates: newRemoved },
    events,
  };
};

const checkRescue = (state: GameState): { state: GameState; events: GameEvent[] } => {
  const events: GameEvent[] = [];
  let newCount = state.rescuedCount;
  const newCompanions = state.companions.map((c) => {
    if (c.rescued) return c;
    const dx = Math.abs(c.coord.x - state.player.coord.x);
    const dy = Math.abs(c.coord.y - state.player.coord.y);
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      newCount++;
      events.push({ type: 'rescue', payload: { companionId: c.id, coord: c.coord } });
      return { ...c, rescued: true };
    }
    return c;
  });
  return {
    state: { ...state, companions: newCompanions, rescuedCount: newCount },
    events,
  };
};

const checkExit = (state: GameState): { state: GameState; events: GameEvent[] } => {
  if (state.rescuedCount === state.totalCompanions && isExit(state.levelData, state.player.coord)) {
    return {
      state: { ...state, isCleared: true },
      events: [{ type: 'win' }],
    };
  }
  return { state, events: [] };
};

export interface MoveResult {
  state: GameState;
  events: GameEvent[];
}

export const handleMove = (prev: GameState, dir: Direction, now: number): MoveResult => {
  let events: GameEvent[] = [];
  let state = prev;

  const { state: timedState, events: timerEvents } = processGateTimers(state, now);
  state = timedState;
  events = events.concat(timerEvents);

  if (state.isFailed || state.isCleared) {
    return { state, events };
  }

  if (now - state.lastMoveTime < MOVE_INTERVAL) {
    return { state: state, events: [] };
  }

  const delta = dirDelta[dir];
  const target = addCoord(state.player.coord, delta);

  if (!inBounds(target)) {
    return { state, events };
  }

  if (isWall(state, target)) {
    return { state, events };
  }

  let newRocks = state.rocks;
  const rockAtTarget = findRockAt(state.rocks, target);
  if (rockAtTarget) {
    const rockTarget = addCoord(target, delta);
    if (!inBounds(rockTarget)) return { state, events };
    if (isWall(state, rockTarget)) return { state, events };
    if (findRockAt(state.rocks, rockTarget)) return { state, events };
    if (isTrap(state.levelData, rockTarget)) {
      newRocks = state.rocks.filter((r) => r.id !== rockAtTarget.id);
    } else {
      newRocks = state.rocks.map((r) =>
        r.id === rockAtTarget.id ? { ...r, coord: rockTarget } : r
      );
    }
  }

  state = {
    ...state,
    rocks: newRocks,
    player: { coord: target },
    stepCount: state.stepCount + 1,
    lastMoveTime: now,
  };
  events.push({ type: 'move', payload: { to: target } });

  const { state: plateState, events: plateEvents } = checkPlatesAndStartTimers(state, now);
  state = plateState;
  events = events.concat(plateEvents);

  if (isTrap(state.levelData, state.player.coord)) {
    state = { ...state, isFailed: true, trapFlashStart: now };
    events.push({ type: 'trap' });
    return { state, events };
  }

  const { state: rescueState, events: rescueEvents } = checkRescue(state);
  state = rescueState;
  events = events.concat(rescueEvents);

  const { state: exitState, events: exitEvents } = checkExit(state);
  state = exitState;
  events = events.concat(exitEvents);

  return { state, events };
};

export const tick = (state: GameState, now: number): MoveResult => {
  return processGateTimers(state, now);
};

export const resetLevel = (state: GameState): MoveResult => {
  const fresh = createInitialState(state.levelIndex, state.startTime);
  return {
    state: fresh,
    events: [{ type: 'reset' }],
  };
};

export const nextLevel = (state: GameState): MoveResult | null => {
  const nextIndex = state.levelIndex + 1;
  if (nextIndex >= levels.length) return null;
  const fresh = createInitialState(nextIndex, state.startTime);
  return { state: fresh, events: [] };
};
