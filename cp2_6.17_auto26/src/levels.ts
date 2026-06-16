import { LevelData, Coord, coordToKey } from './gameTypes';

const makePlateMap = (entries: [Coord, Coord[]][]): Map<string, Coord[]> => {
  const map = new Map<string, Coord[]>();
  entries.forEach(([plate, gates]) => {
    map.set(coordToKey(plate), gates);
  });
  return map;
};

export const levels: LevelData[] = [
  {
    id: 1,
    width: 8,
    height: 8,
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 },
      { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 },
      { x: 3, y: 2 }, { x: 3, y: 3 },
      { x: 5, y: 5 },
    ],
    traps: [
      { x: 4, y: 4 },
    ],
    rocks: [
      { id: 'r1', coord: { x: 2, y: 3 } },
    ],
    pressurePlates: [
      { x: 2, y: 5 },
    ],
    pressurePlateToGate: makePlateMap([
      [{ x: 2, y: 5 }, [{ x: 5, y: 5 }]],
    ]),
    companions: [
      { id: 'c1', coord: { x: 6, y: 2 } },
    ],
    exit: { x: 6, y: 6 },
    playerStart: { x: 1, y: 1 },
    stepLimit: 40,
  },
  {
    id: 2,
    width: 8,
    height: 8,
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 },
      { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 },
      { x: 2, y: 2 }, { x: 4, y: 2 },
      { x: 2, y: 4 }, { x: 3, y: 4 },
      { x: 5, y: 4 },
    ],
    traps: [
      { x: 3, y: 2 }, { x: 5, y: 5 },
    ],
    rocks: [
      { id: 'r1', coord: { x: 3, y: 3 } },
      { id: 'r2', coord: { x: 4, y: 5 } },
    ],
    pressurePlates: [
      { x: 1, y: 4 },
      { x: 6, y: 3 },
    ],
    pressurePlateToGate: makePlateMap([
      [{ x: 1, y: 4 }, [{ x: 2, y: 4 }]],
      [{ x: 6, y: 3 }, [{ x: 5, y: 4 }]],
    ]),
    companions: [
      { id: 'c1', coord: { x: 6, y: 1 } },
      { id: 'c2', coord: { x: 1, y: 6 } },
    ],
    exit: { x: 6, y: 6 },
    playerStart: { x: 1, y: 1 },
    stepLimit: 60,
  },
  {
    id: 3,
    width: 8,
    height: 8,
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 },
      { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 },
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
      { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 },
      { x: 1, y: 5 }, { x: 2, y: 5 },
      { x: 6, y: 2 },
    ],
    traps: [
      { x: 2, y: 2 }, { x: 5, y: 3 }, { x: 1, y: 4 },
    ],
    rocks: [
      { id: 'r1', coord: { x: 1, y: 2 } },
      { id: 'r2', coord: { x: 5, y: 2 } },
      { id: 'r3', coord: { x: 2, y: 4 } },
    ],
    pressurePlates: [
      { x: 2, y: 1 },
      { x: 5, y: 6 },
    ],
    pressurePlateToGate: makePlateMap([
      [{ x: 2, y: 1 }, [{ x: 3, y: 3 }]],
      [{ x: 5, y: 6 }, [{ x: 4, y: 4 }]],
    ]),
    companions: [
      { id: 'c1', coord: { x: 5, y: 1 } },
      { id: 'c2', coord: { x: 3, y: 6 } },
      { id: 'c3', coord: { x: 6, y: 5 } },
    ],
    exit: { x: 6, y: 6 },
    playerStart: { x: 1, y: 1 },
    stepLimit: 80,
  },
  {
    id: 4,
    width: 8,
    height: 8,
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 },
      { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 },
      { x: 2, y: 1 }, { x: 2, y: 2 },
      { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 5, y: 5 }, { x: 6, y: 5 },
      { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 },
      { x: 5, y: 1 },
    ],
    traps: [
      { x: 3, y: 1 }, { x: 1, y: 3 }, { x: 6, y: 3 }, { x: 4, y: 5 },
    ],
    rocks: [
      { id: 'r1', coord: { x: 1, y: 2 } },
      { id: 'r2', coord: { x: 3, y: 3 } },
      { id: 'r3', coord: { x: 5, y: 4 } },
      { id: 'r4', coord: { x: 3, y: 5 } },
    ],
    pressurePlates: [
      { x: 3, y: 2 },
      { x: 1, y: 6 },
      { x: 6, y: 2 },
    ],
    pressurePlateToGate: makePlateMap([
      [{ x: 3, y: 2 }, [{ x: 4, y: 2 }]],
      [{ x: 1, y: 6 }, [{ x: 2, y: 5 }]],
      [{ x: 6, y: 2 }, [{ x: 5, y: 1 }]],
    ]),
    companions: [
      { id: 'c1', coord: { x: 6, y: 1 } },
      { id: 'c2', coord: { x: 1, y: 5 } },
      { id: 'c3', coord: { x: 5, y: 6 } },
      { id: 'c4', coord: { x: 3, y: 6 } },
    ],
    exit: { x: 6, y: 6 },
    playerStart: { x: 1, y: 1 },
    stepLimit: 100,
  },
];
