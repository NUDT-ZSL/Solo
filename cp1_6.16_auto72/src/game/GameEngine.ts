import {
  CellType,
  CellVisibility,
  Direction,
  GameStatus,
  MapData,
  PlayerState,
  PlayerStatus,
  Position,
  RenderData,
  TrapInfo,
  VisibilityLevel,
} from './types';
import { generateMap, directionToDelta } from './MapGenerator';
import { flashLight, echoScan } from './PerceptionUtils';

const FLASH_DURATION = 4000;
const ECHO_DURATION = 1000;
const FLASH_COOLDOWN = 4000;
const ECHO_COOLDOWN = 1000;
const TRAP_HIGHLIGHT_DURATION = 2000;
const SCREEN_SHAKE_DURATION = 100;
const MAX_HEALTH = 5;
const INITIAL_FLASHBANGS = 3;
const INITIAL_ECHO_SCANS = 2;

type ChangeListener = (data: RenderData) => void;

export class GameEngine {
  private map: MapData;
  private player: PlayerState;
  private visibility: CellVisibility[][];
  private status: GameStatus = 'playing';
  private listeners: ChangeListener[] = [];
  private animFrameId: number = 0;
  private lastTime: number = 0;

  private screenShakeUntil = 0;
  private trapHighlightPositions: Position[] = [];

  private flashCells: Position[] = [];
  private echoCells: Position[] = [];
  private flashExpireAt = 0;
  private echoExpireAt = 0;

  private flashCooldownEnd = 0;
  private echoCooldownEnd = 0;

  private level: number;
  private seed: number;

  constructor(seed: number, level: number) {
    this.seed = seed;
    this.level = level;
    this.map = generateMap(seed, level);

    this.player = {
      position: { x: 1, y: 1 },
      direction: Direction.RIGHT,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      steps: 0,
      flashbangs: INITIAL_FLASHBANGS,
      maxFlashbangs: INITIAL_FLASHBANGS,
      echoScans: INITIAL_ECHO_SCANS,
      maxEchoScans: INITIAL_ECHO_SCANS,
    };

    this.visibility = this.createVisibilityGrid();

    this.revealCell(this.player.position.x, this.player.position.y);

    this.start();
  }

  private createVisibilityGrid(): CellVisibility[][] {
    return Array.from({ length: this.map.height }, () =>
      Array.from({ length: this.map.width }, () => ({
        level: 'hidden' as VisibilityLevel,
        flashUntil: 0,
        echoUntil: 0,
      }))
    );
  }

  private revealCell(x: number, y: number): void {
    if (x >= 0 && x < this.map.width && y >= 0 && y < this.map.height) {
      const v = this.visibility[y][x];
      if (v.level === 'hidden') {
        v.level = 'permanent';
      }
    }
  }

  private revealCells(cells: Position[], asPermanent: boolean): void {
    const now = performance.now();
    for (const pos of cells) {
      if (pos.x < 0 || pos.x >= this.map.width || pos.y < 0 || pos.y >= this.map.height) continue;
      const v = this.visibility[pos.y][pos.x];
      if (asPermanent) {
        v.level = 'permanent';
      }
      if (v.level === 'hidden') {
        v.level = 'flash';
      }
      if (v.level === 'flash' || v.level === 'echo' || v.level === 'permanent') {
        if (!asPermanent && v.level !== 'permanent') {
          if (v.level === 'flash') {
            v.flashUntil = now + FLASH_DURATION;
          } else {
            v.echoUntil = now + ECHO_DURATION;
            v.level = 'echo';
          }
        }
      }
    }
  }

  movePlayer(direction: Direction): void {
    if (this.status !== 'playing') return;

    this.player.direction = direction;
    const delta = directionToDelta(direction);
    const newX = this.player.position.x + delta.x;
    const newY = this.player.position.y + delta.y;

    if (newX < 0 || newX >= this.map.width || newY < 0 || newY >= this.map.height) {
      this.triggerScreenShake();
      return;
    }

    const targetCell = this.map.grid[newY][newX];
    if (targetCell === CellType.WALL) {
      this.triggerScreenShake();
      return;
    }

    this.player.position = { x: newX, y: newY };
    this.player.steps++;
    this.revealCell(newX, newY);

    this.revealAdjacentForMovement(newX, newY);

    if (
      targetCell === CellType.TRAP_SPIKE ||
      targetCell === CellType.TRAP_ROCK ||
      targetCell === CellType.TRAP_POISON
    ) {
      this.handleTrap(newX, newY);
    }

    if (targetCell === CellType.EXIT) {
      this.status = 'won';
    }
  }

  private revealAdjacentForMovement(x: number, y: number): void {
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];
    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (nx >= 0 && nx < this.map.width && ny >= 0 && ny < this.map.height) {
        if (this.visibility[ny][nx].level === 'hidden') {
          this.visibility[ny][nx].level = 'permanent';
        }
      }
    }
  }

  private handleTrap(x: number, y: number): void {
    this.player.health--;
    this.screenShakeUntil = performance.now() + SCREEN_SHAKE_DURATION;

    const now = performance.now();
    this.trapHighlightPositions = [{ x, y }];

    const trap = this.map.traps.find((t) => t.position.x === x && t.position.y === y);
    if (trap) {
      trap.revealed = true;
      trap.highlightUntil = now + TRAP_HIGHLIGHT_DURATION;
    }

    this.revealCell(x, y);

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.status = 'lost';
    }
  }

  private triggerScreenShake(): void {
    this.screenShakeUntil = performance.now() + SCREEN_SHAKE_DURATION;
  }

  useFlashbang(): void {
    if (this.status !== 'playing') return;
    if (this.player.flashbangs <= 0) return;

    const now = performance.now();
    if (now < this.flashCooldownEnd) return;

    this.player.flashbangs--;
    this.flashCooldownEnd = now + FLASH_COOLDOWN;

    const result = flashLight(this.player.position, this.map);
    this.flashCells = result.cells;
    this.flashExpireAt = now + FLASH_DURATION;

    for (const pos of result.cells) {
      if (pos.x >= 0 && pos.x < this.map.width && pos.y >= 0 && pos.y < this.map.height) {
        const v = this.visibility[pos.y][pos.x];
        v.level = 'flash';
        v.flashUntil = now + FLASH_DURATION;
      }
    }

    for (const trapPos of result.traps) {
      const trap = this.map.traps.find(
        (t) => t.position.x === trapPos.x && t.position.y === trapPos.y
      );
      if (trap) trap.revealed = true;
    }
  }

  useEchoScan(): void {
    if (this.status !== 'playing') return;
    if (this.player.echoScans <= 0) return;

    const now = performance.now();
    if (now < this.echoCooldownEnd) return;

    this.player.echoScans--;
    this.echoCooldownEnd = now + ECHO_COOLDOWN;

    const result = echoScan(this.player.position, this.player.direction, this.map);
    this.echoCells = result.cells;
    this.echoExpireAt = now + ECHO_DURATION;

    for (const pos of result.cells) {
      if (pos.x >= 0 && pos.x < this.map.width && pos.y >= 0 && pos.y < this.map.height) {
        const v = this.visibility[pos.y][pos.x];
        if (v.level !== 'permanent') {
          v.level = 'echo';
          v.echoUntil = now + ECHO_DURATION;
        }
      }
    }

    for (const trapPos of result.traps) {
      const trap = this.map.traps.find(
        (t) => t.position.x === trapPos.x && t.position.y === trapPos.y
      );
      if (trap) trap.revealed = true;
    }
  }

  getPlayerStatus(): PlayerStatus {
    const now = performance.now();
    return {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      flashbangs: this.player.flashbangs,
      maxFlashbangs: this.player.maxFlashbangs,
      echoScans: this.player.echoScans,
      maxEchoScans: this.player.maxEchoScans,
      flashCooldown: Math.max(0, this.flashCooldownEnd - now),
      echoCooldown: Math.max(0, this.echoCooldownEnd - now),
    };
  }

  getLevel(): number {
    return this.level;
  }

  getSeed(): number {
    return this.seed;
  }

  private update(now: number): void {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const v = this.visibility[y][x];
        if (v.level === 'flash' && now >= v.flashUntil) {
          v.level = 'permanent';
        }
        if (v.level === 'echo' && now >= v.echoUntil) {
          v.level = 'hidden';
        }
      }
    }

    if (now >= this.flashExpireAt) {
      this.flashCells = [];
    }
    if (now >= this.echoExpireAt) {
      this.echoCells = [];
    }

    this.trapHighlightPositions = this.map.traps
      .filter((t) => t.highlightUntil > now)
      .map((t) => t.position);
  }

  private getRenderData(): RenderData {
    return {
      player: { ...this.player, position: { ...this.player.position } },
      map: this.map,
      visibility: this.visibility,
      status: this.status,
      screenShakeUntil: this.screenShakeUntil,
      trapHighlightPositions: [...this.trapHighlightPositions],
      activeEffects: {
        flashCells: [...this.flashCells],
        echoCells: [...this.echoCells],
        flashExpireAt: this.flashExpireAt,
        echoExpireAt: this.echoExpireAt,
      },
    };
  }

  private loop = (timestamp: number): void => {
    this.update(timestamp);
    const data = this.getRenderData();
    for (const listener of this.listeners) {
      listener(data);
    }
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private start(): void {
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.listeners = [];
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }
}
