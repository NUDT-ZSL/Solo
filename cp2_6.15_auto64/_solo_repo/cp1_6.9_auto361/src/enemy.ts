import { MazeMap, TOTAL_COLS, TOTAL_ROWS } from './map';
import { Player } from './player';

export const PATROL_SPEED = 1.5;
export const CHASE_SPEED = PATROL_SPEED * 2;
export const RETREAT_SPEED = PATROL_SPEED * 0.3;
export const DETECTION_RADIUS = 4;
export const CHASE_RADIUS = 5;
export const DIRECTION_CHANGE_INTERVAL = 2;

export type SlimeState = 'patrol' | 'chase' | 'retreat';

export interface Slime {
  gridX: number;
  gridY: number;
  state: SlimeState;
  direction: { dx: number; dy: number };
  directionTimer: number;
  radius: number;
  color: string;
}

export class EnemyManager {
  public slimes: Slime[];

  constructor(slimeSpawns: { x: number; y: number }[]) {
    this.slimes = [];
    for (const spawn of slimeSpawns.slice(0, 6)) {
      this.slimes.push({
        gridX: spawn.x,
        gridY: spawn.y,
        state: 'patrol',
        direction: this.randomDirection(),
        directionTimer: DIRECTION_CHANGE_INTERVAL,
        radius: 12,
        color: 'rgba(0, 255, 100, 0.6)'
      });
    }
  }

  private randomDirection(): { dx: number; dy: number } {
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  public update(dt: number, map: MazeMap, player: Player): void {
    for (const slime of this.slimes) {
      const dx = player.gridX - slime.gridX;
      const dy = player.gridY - slime.gridY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let prevState = slime.state;

      if (distance < DETECTION_RADIUS && !player.isInBrightArea) {
        slime.state = 'chase';
      } else if (distance < DETECTION_RADIUS && player.isInBrightArea) {
        slime.state = 'retreat';
      } else if (distance > CHASE_RADIUS) {
        slime.state = 'patrol';
      }

      if (slime.state === 'chase') {
        slime.radius = 16;
        slime.color = 'rgba(255, 50, 50, 0.65)';
      } else if (slime.state === 'retreat') {
        slime.radius = 14;
        slime.color = 'rgba(255, 150, 100, 0.6)';
      } else {
        slime.radius = 12;
        slime.color = 'rgba(0, 255, 100, 0.6)';
      }

      let speed = PATROL_SPEED;
      let moveDir: { dx: number; dy: number };

      if (slime.state === 'chase') {
        speed = CHASE_SPEED;
        const ndx = Math.sign(dx);
        const ndy = Math.sign(dy);
        if (Math.abs(dx) > Math.abs(dy)) {
          moveDir = map.isPassage(Math.round(slime.gridX + ndx), Math.round(slime.gridY))
            ? { dx: ndx, dy: 0 }
            : { dx: 0, dy: ndy };
        } else {
          moveDir = map.isPassage(Math.round(slime.gridX), Math.round(slime.gridY + ndy))
            ? { dx: 0, dy: ndy }
            : { dx: ndx, dy: 0 };
        }
      } else if (slime.state === 'retreat') {
        speed = RETREAT_SPEED;
        const ndx = -Math.sign(dx);
        const ndy = -Math.sign(dy);
        if (Math.abs(dx) > Math.abs(dy)) {
          moveDir = map.isPassage(Math.round(slime.gridX + ndx), Math.round(slime.gridY))
            ? { dx: ndx, dy: 0 }
            : { dx: 0, dy: ndy };
        } else {
          moveDir = map.isPassage(Math.round(slime.gridX), Math.round(slime.gridY + ndy))
            ? { dx: 0, dy: ndy }
            : { dx: ndx, dy: 0 };
        }
      } else {
        slime.directionTimer -= dt;
        if (slime.directionTimer <= 0) {
          slime.direction = this.randomDirection();
          slime.directionTimer = DIRECTION_CHANGE_INTERVAL;
        }
        moveDir = slime.direction;
      }

      const step = speed * dt;
      const newX = slime.gridX + moveDir.dx * step;
      const newY = slime.gridY + moveDir.dy * step;

      let movedX = false;
      let movedY = false;

      if (map.isPassage(Math.round(newX), Math.round(slime.gridY))) {
        slime.gridX = newX;
        movedX = true;
      }
      if (map.isPassage(Math.round(slime.gridX), Math.round(newY))) {
        slime.gridY = newY;
        movedY = true;
      }

      if (slime.state === 'patrol' && (!movedX || !movedY)) {
        slime.direction = this.randomDirection();
        slime.directionTimer = DIRECTION_CHANGE_INTERVAL;
      }
    }
  }

  public checkPlayerCollision(player: Player): boolean {
    for (const slime of this.slimes) {
      const dx = player.gridX - slime.gridX;
      const dy = player.gridY - slime.gridY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 0.7) {
        return true;
      }
    }
    return false;
  }
}
