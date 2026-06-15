import { Maze, CELL_SIZE } from './maze';
import { Player } from './player';

export class Gem {
  public x: number;
  public y: number;
  public radius: number;
  public rotation: number;
  public collected: boolean;
  public collectAnim: number;

  constructor(gx: number, gy: number) {
    this.x = gx * CELL_SIZE + CELL_SIZE / 2;
    this.y = gy * CELL_SIZE + CELL_SIZE / 2;
    this.radius = 10;
    this.rotation = 0;
    this.collected = false;
    this.collectAnim = 0;
  }

  public update(dt: number): void {
    if (!this.collected) {
      this.rotation += 20 * (Math.PI / 180) * dt;
    } else {
      this.collectAnim += dt;
    }
  }

  public checkCollect(player: Player): boolean {
    if (this.collected) return false;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.radius + player.radius) {
      this.collected = true;
      this.collectAnim = 0;
      return true;
    }
    return false;
  }

  public isCollectAnimDone(): boolean {
    return this.collectAnim > 0.4;
  }
}

export class ShadowCreature {
  public x: number;
  public y: number;
  public radius: number;
  public speed: number;
  public chaseSpeed: number;
  public targetX: number;
  public targetY: number;
  public wanderTimer: number;
  public shapeSeed: number;
  public opacity: number;

  constructor(gx: number, gy: number) {
    this.x = gx * CELL_SIZE + CELL_SIZE / 2;
    this.y = gy * CELL_SIZE + CELL_SIZE / 2;
    this.radius = 15;
    this.speed = 25;
    this.chaseSpeed = 90;
    this.targetX = this.x;
    this.targetY = this.y;
    this.wanderTimer = 0;
    this.shapeSeed = Math.random() * 1000;
    this.opacity = 0.3;
  }

  public update(dt: number, player: Player, maze: Maze): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const chaseRange = CELL_SIZE * 2;

    let vx: number;
    let vy: number;

    if (dist < chaseRange) {
      const len = dist > 0 ? dist : 1;
      vx = (dx / len) * this.chaseSpeed;
      vy = (dy / len) * this.chaseSpeed;
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1 + Math.random() * 2;
        const dirs = [
          [0, -1], [0, 1], [-1, 0], [1, 0]
        ];
        const [ddx, ddy] = dirs[Math.floor(Math.random() * dirs.length)];
        this.targetX = this.x + ddx * CELL_SIZE * 2;
        this.targetY = this.y + ddy * CELL_SIZE * 2;
      }
      const tdx = this.targetX - this.x;
      const tdy = this.targetY - this.y;
      const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tlen > 1) {
        vx = (tdx / tlen) * this.speed;
        vy = (tdy / tlen) * this.speed;
      } else {
        vx = 0;
        vy = 0;
      }
    }

    const nx = this.x + vx * dt;
    const ny = this.y + vy * dt;

    const checkX = Math.floor(nx / CELL_SIZE);
    const checkY = Math.floor(this.y / CELL_SIZE);
    if (!maze.isWall(checkX, checkY)) {
      this.x = nx;
    }

    const checkX2 = Math.floor(this.x / CELL_SIZE);
    const checkY2 = Math.floor(ny / CELL_SIZE);
    if (!maze.isWall(checkX2, checkY2)) {
      this.y = ny;
    }
  }
}

export class Portal {
  public x: number;
  public y: number;
  public radius: number;
  public pulseTime: number;
  public active: boolean;

  constructor(gx: number, gy: number) {
    this.x = gx * CELL_SIZE + CELL_SIZE / 2;
    this.y = gy * CELL_SIZE + CELL_SIZE / 2;
    this.radius = 18;
    this.pulseTime = 0;
    this.active = false;
  }

  public update(dt: number, allGemsCollected: boolean): void {
    this.pulseTime += dt;
    this.active = allGemsCollected;
  }

  public checkEnter(player: Player): boolean {
    if (!this.active) return false;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + player.radius;
  }
}

export function generateGems(maze: Maze, count: number, playerGrid: { x: number; y: number }, portalGrid: { x: number; y: number }): Gem[] {
  const floors = maze.getFloors().filter(
    f => !(f.x === playerGrid.x && f.y === playerGrid.y) && !(f.x === portalGrid.x && f.y === portalGrid.y)
  );
  const shuffled = floors.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return selected.map(f => new Gem(f.x, f.y));
}

export function generateCreatures(maze: Maze, count: number, playerGrid: { x: number; y: number }): ShadowCreature[] {
  const creatures: ShadowCreature[] = [];
  const floors = maze.getFloors().filter(f => {
    const dx = f.x - playerGrid.x;
    const dy = f.y - playerGrid.y;
    return Math.sqrt(dx * dx + dy * dy) >= 5;
  });
  const shuffled = floors.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  for (const f of selected) {
    creatures.push(new ShadowCreature(f.x, f.y));
  }
  return creatures;
}
