import { Player, Role, MoveSpeed, InputState, Vector2, Rect, GameMap } from '../types';

export class PlayerManager {
  private hunter: Player;
  private stalker: Player;
  private totalMoveDistance: number = 0;

  constructor() {
    this.hunter = this.createHunter();
    this.stalker = this.createStalker();
  }

  private createHunter(): Player {
    return {
      role: Role.HUNTER,
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      moveSpeed: MoveSpeed.WALK,
      isCrouching: false,
      isOnWall: false,
      direction: 0,
      shadowCloneCooldown: 0,
      shadowCloneActive: false,
      health: 100,
      shield: 50
    };
  }

  private createStalker(): Player {
    return {
      role: Role.STALKER,
      position: { x: 700, y: 500 },
      velocity: { x: 0, y: 0 },
      moveSpeed: MoveSpeed.WALK,
      isCrouching: false,
      isOnWall: false,
      direction: Math.PI,
      shadowCloneCooldown: 0,
      shadowCloneActive: false,
      health: 100,
      shield: 50
    };
  }

  resetPositions(map: GameMap): void {
    if (map.rooms.length >= 2) {
      const firstRoom = map.rooms[0].bounds;
      const lastRoom = map.rooms[map.rooms.length - 1].bounds;
      
      this.hunter.position = {
        x: firstRoom.x + firstRoom.w / 2,
        y: firstRoom.y + firstRoom.h / 2
      };
      
      this.stalker.position = {
        x: lastRoom.x + lastRoom.w / 2,
        y: lastRoom.y + lastRoom.h / 2
      };
    } else {
      this.hunter.position = { x: 100, y: 100 };
      this.stalker.position = { x: 700, y: 500 };
    }
    
    this.hunter.velocity = { x: 0, y: 0 };
    this.stalker.velocity = { x: 0, y: 0 };
    this.stalker.shadowCloneCooldown = 0;
    this.stalker.shadowCloneActive = false;
    this.stalker.isCrouching = false;
    this.stalker.isOnWall = false;
    this.stalker.moveSpeed = MoveSpeed.WALK;
    this.stalker.health = 100;
    this.stalker.shield = 50;
    this.totalMoveDistance = 0;
  }

  getHunter(): Player {
    return { ...this.hunter };
  }

  getStalker(): Player {
    return { ...this.stalker };
  }

  getTotalMoveDistance(): number {
    return this.totalMoveDistance;
  }

  updateStalker(
    input: InputState,
    obstacles: Rect[],
    mapWidth: number,
    mapHeight: number,
    deltaTime: number
  ): void {
    let speed = MoveSpeed.WALK;
    
    if (input.crouch) {
      speed = MoveSpeed.CROUCH;
      this.stalker.isCrouching = true;
    } else if (input.sprint) {
      speed = MoveSpeed.SPRINT;
      this.stalker.isCrouching = false;
    } else {
      this.stalker.isCrouching = false;
    }
    
    this.stalker.moveSpeed = speed;
    this.stalker.isOnWall = input.onWall;

    let vx = 0;
    let vy = 0;
    
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;

    const length = Math.sqrt(vx * vx + vy * vy);
    if (length > 0) {
      vx = (vx / length) * speed;
      vy = (vy / length) * speed;
      this.stalker.direction = Math.atan2(vy, vx);
    }

    const newPos = {
      x: this.stalker.position.x + vx,
      y: this.stalker.position.y + vy
    };

    const playerRadius = 8;
    const adjustedPos = this.resolveCollision(
      this.stalker.position,
      newPos,
      obstacles,
      playerRadius,
      mapWidth,
      mapHeight
    );

    const dx = adjustedPos.x - this.stalker.position.x;
    const dy = adjustedPos.y - this.stalker.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.totalMoveDistance += distance;

    this.stalker.position = adjustedPos;
    this.stalker.velocity = { x: vx, y: vy };

    if (this.stalker.shadowCloneCooldown > 0) {
      this.stalker.shadowCloneCooldown = Math.max(0, this.stalker.shadowCloneCooldown - deltaTime);
    }
  }

  updateHunter(
    targetPos: Vector2,
    obstacles: Rect[],
    mapWidth: number,
    mapHeight: number
  ): void {
    const dx = targetPos.x - this.hunter.position.x;
    const dy = targetPos.y - this.hunter.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      const speed = 2;
      let vx = (dx / dist) * speed;
      let vy = (dy / dist) * speed;
      
      this.hunter.direction = Math.atan2(vy, vx);

      const newPos = {
        x: this.hunter.position.x + vx,
        y: this.hunter.position.y + vy
      };

      const playerRadius = 10;
      const adjustedPos = this.resolveCollision(
        this.hunter.position,
        newPos,
        obstacles,
        playerRadius,
        mapWidth,
        mapHeight
      );

      this.hunter.position = adjustedPos;
      this.hunter.velocity = { x: vx, y: vy };
    } else {
      this.hunter.velocity = { x: 0, y: 0 };
    }
  }

  private resolveCollision(
    oldPos: Vector2,
    newPos: Vector2,
    obstacles: Rect[],
    radius: number,
    mapWidth: number,
    mapHeight: number
  ): Vector2 {
    let x = Math.max(radius, Math.min(mapWidth - radius, newPos.x));
    let y = Math.max(radius, Math.min(mapHeight - radius, newPos.y));

    for (const obstacle of obstacles) {
      if (this.circleRectCollision(x, y, radius, obstacle)) {
        const closestX = Math.max(obstacle.x, Math.min(x, obstacle.x + obstacle.w));
        const closestY = Math.max(obstacle.y, Math.min(y, obstacle.y + obstacle.h));
        
        const dx = x - closestX;
        const dy = y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const push = (radius - dist) / dist;
          x += dx * push;
          y += dy * push;
        } else {
          const oldDx = oldPos.x - (obstacle.x + obstacle.w / 2);
          const oldDy = oldPos.y - (obstacle.y + obstacle.h / 2);
          
          if (Math.abs(oldDx) > Math.abs(oldDy)) {
            x = oldDx > 0 ? obstacle.x + obstacle.w + radius : obstacle.x - radius;
          } else {
            y = oldDy > 0 ? obstacle.y + obstacle.h + radius : obstacle.y - radius;
          }
        }
      }
    }

    x = Math.max(radius, Math.min(mapWidth - radius, x));
    y = Math.max(radius, Math.min(mapHeight - radius, y));

    return { x, y };
  }

  private circleRectCollision(
    cx: number,
    cy: number,
    radius: number,
    rect: Rect
  ): boolean {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    
    const dx = cx - closestX;
    const dy = cy - closestY;
    
    return (dx * dx + dy * dy) < (radius * radius);
  }

  checkCollisionBetweenPlayers(): boolean {
    const dx = this.hunter.position.x - this.stalker.position.x;
    const dy = this.hunter.position.y - this.stalker.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    return dist < 15;
  }

  useShadowClone(): boolean {
    if (this.stalker.shadowCloneCooldown <= 0 && !this.stalker.shadowCloneActive) {
      this.stalker.shadowCloneActive = true;
      this.stalker.shadowCloneCooldown = 20000;
      return true;
    }
    return false;
  }

  deactivateShadowClone(): void {
    this.stalker.shadowCloneActive = false;
  }

  getShadowCloneCooldownPercent(): number {
    return 1 - (this.stalker.shadowCloneCooldown / 20000);
  }

  canUseShadowClone(): boolean {
    return this.stalker.shadowCloneCooldown <= 0;
  }

  isStalkerCrouching(): boolean {
    return this.stalker.isCrouching;
  }
}
