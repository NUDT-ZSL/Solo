export interface CellData {
  alive: boolean;
  age: number;
}

export interface Rules {
  survive: number[];
  birth: number[];
}

export type GridData = Uint8Array;

interface WorkerMessage {
  type: 'init' | 'step' | 'start' | 'stop' | 'setRules' | 'setGrid';
  gridSize?: number;
  rules?: Rules;
  grid?: GridData;
  speed?: number;
}

interface WorkerResponse {
  type: 'gridUpdate';
  grid: GridData;
  generation: number;
}

let gridSize = 16;
let rules: Rules = { survive: [2, 3], birth: [3] };
let grid: GridData;
let nextGrid: GridData;
let isRunning = false;
let speed = 5;
let generation = 0;
let animationId: number | null = null;
let lastStepTime = 0;

function createEmptyGrid(size: number): GridData {
  const total = size * size * size;
  const data = new Uint8Array(total * 2);
  for (let i = 0; i < total; i++) {
    data[i * 2] = 0;
    data[i * 2 + 1] = 0;
  }
  return data;
}

function getIndex(x: number, y: number, z: number): number {
  return (x * gridSize * gridSize + y * gridSize + z) * 2;
}

function isInBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize;
}

function getCell(data: GridData, x: number, y: number, z: number): { alive: boolean; age: number } {
  if (!isInBounds(x, y, z)) return { alive: false, age: 0 };
  const idx = getIndex(x, y, z);
  return {
    alive: data[idx] === 1,
    age: data[idx + 1],
  };
}

function setCell(data: GridData, x: number, y: number, z: number, alive: boolean, age: number): void {
  const idx = getIndex(x, y, z);
  data[idx] = alive ? 1 : 0;
  data[idx + 1] = age;
}

function countNeighbors(x: number, y: number, z: number): number {
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const cell = getCell(grid, x + dx, y + dy, z + dz);
        if (cell.alive) count++;
      }
    }
  }
  return count;
}

function computeNextGeneration(): void {
  const total = gridSize * gridSize * gridSize;
  nextGrid = new Uint8Array(grid);

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const cell = getCell(grid, x, y, z);
        const neighbors = countNeighbors(x, y, z);
        let nextAlive = cell.alive;
        let nextAge = cell.age;

        if (cell.alive) {
          if (rules.survive.includes(neighbors)) {
            nextAge = cell.age + 1;
          } else {
            nextAlive = false;
            nextAge = 0;
          }
        } else {
          if (rules.birth.includes(neighbors)) {
            nextAlive = true;
            nextAge = 0;
          }
        }

        setCell(nextGrid, x, y, z, nextAlive, nextAge);
      }
    }
  }

  grid = nextGrid;
  generation++;
}

function sendGridUpdate(): void {
  const response: WorkerResponse = {
    type: 'gridUpdate',
    grid: new Uint8Array(grid),
    generation,
  };
  postMessage(response);
}

function step(): void {
  computeNextGeneration();
  sendGridUpdate();
}

function gameLoop(timestamp: number): void {
  if (!isRunning) return;

  const stepInterval = 1000 / speed;
  if (timestamp - lastStepTime >= stepInterval) {
    step();
    lastStepTime = timestamp;
  }

  animationId = requestAnimationFrame(gameLoop);
}

function start(): void {
  if (isRunning) return;
  isRunning = true;
  lastStepTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function stop(): void {
  isRunning = false;
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function setGrid(newGrid: GridData): void {
  grid = new Uint8Array(newGrid);
  generation = 0;
}

function init(size: number): void {
  gridSize = size;
  grid = createEmptyGrid(size);
  generation = 0;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const message = e.data;

  switch (message.type) {
    case 'init':
      if (message.gridSize !== undefined) {
        init(message.gridSize);
      }
      if (message.rules) {
        rules = message.rules;
      }
      sendGridUpdate();
      break;

    case 'step':
      step();
      break;

    case 'start':
      if (message.speed !== undefined) {
        speed = message.speed;
      }
      start();
      break;

    case 'stop':
      stop();
      break;

    case 'setRules':
      if (message.rules) {
        rules = message.rules;
      }
      break;

    case 'setGrid':
      if (message.grid) {
        setGrid(message.grid);
        sendGridUpdate();
      }
      break;
  }
};
