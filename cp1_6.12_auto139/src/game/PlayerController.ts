import { WorldManager } from './WorldManager';

export interface PlayerState {
  x: number;
  y: number;
  velocityY: number;
  isJumping: boolean;
  jumpFrame: number;
  facingRight: boolean;
  isMoving: boolean;
  squash: number;
}

export class PlayerController {
  private world: WorldManager;
  private state: PlayerState;
  private cellSize: number;
  private playerSize: number;
  private moveSpeed: number;
  private jumpDuration: number;
  private jumpHeight: number;
  private keys: Set<string> = new Set();
  private gravity: number;

  constructor(world: WorldManager, cellSize: number = 32) {
    this.world = world;
    this.cellSize = cellSize;
    this.playerSize = 16;
    this.moveSpeed = 60;
    this.jumpDuration = 12;
    this.jumpHeight = 2;
    this.gravity = 0.5;

    const startPos = world.getPlayerStart();
    this.state = {
      x: startPos.x * cellSize + (cellSize - this.playerSize) / 2,
      y: startPos.y * cellSize + (cellSize - this.playerSize) / 2,
      velocityY: 0,
      isJumping: false,
      jumpFrame: 0,
      facingRight: true,
      isMoving: false,
      squash: 1,
    };
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  getGridPosition(): { x: number; y: number } {
    return {
      x: Math.floor(this.state.x / this.cellSize),
      y: Math.floor(this.state.y / this.cellSize),
    };
  }

  setPosition(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
  }

  resetPosition(): void {
    const startPos = this.world.getPlayerStart();
    this.state.x = startPos.x * this.cellSize + (this.cellSize - this.playerSize) / 2;
    this.state.y = startPos.y * this.cellSize + (this.cellSize - this.playerSize) / 2;
    this.state.velocityY = 0;
    this.state.isJumping = false;
    this.state.jumpFrame = 0;
    this.state.squash = 1;
  }

  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
    
    if (key === ' ' && !this.state.isJumping) {
      this.startJump();
    }
  }

  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  private startJump(): void {
    if (this.isGrounded()) {
      this.state.isJumping = true;
      this.state.jumpFrame = 0;
      this.state.squash = 0.7;
    }
  }

  private isGrounded(): boolean {
    const { x, y } = this.state;
    const size = this.playerSize;
    
    const bottomY = y + size;
    const nextGridY = Math.floor(bottomY / this.cellSize);
    
    const leftGridX = Math.floor(x / this.cellSize);
    const rightGridX = Math.floor((x + size - 1) / this.cellSize);
    
    for (let gx = leftGridX; gx <= rightGridX; gx++) {
      if (this.world.isSolid(gx, nextGridY)) {
        return true;
      }
    }
    
    return false;
  }

  private checkCollision(newX: number, newY: number): boolean {
    const size = this.playerSize;
    
    const corners = [
      { x: newX, y: newY },
      { x: newX + size - 1, y: newY },
      { x: newX, y: newY + size - 1 },
      { x: newX + size - 1, y: newY + size - 1 },
      { x: newX + size / 2, y: newY },
      { x: newX + size / 2, y: newY + size - 1 },
      { x: newX, y: newY + size / 2 },
      { x: newX + size - 1, y: newY + size / 2 },
    ];
    
    for (const corner of corners) {
      const gridX = Math.floor(corner.x / this.cellSize);
      const gridY = Math.floor(corner.y / this.cellSize);
      
      if (this.world.isSolid(gridX, gridY)) {
        return true;
      }
    }
    
    return false;
  }

  update(deltaTime: number): void {
    let dx = 0;
    let dy = 0;
    
    this.state.isMoving = false;

    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      dx -= this.moveSpeed * deltaTime;
      this.state.facingRight = false;
      this.state.isMoving = true;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      dx += this.moveSpeed * deltaTime;
      this.state.facingRight = true;
      this.state.isMoving = true;
    }
    if (this.keys.has('w') || this.keys.has('arrowup')) {
      dy -= this.moveSpeed * deltaTime;
      this.state.isMoving = true;
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      dy += this.moveSpeed * deltaTime;
      this.state.isMoving = true;
    }

    if (dx !== 0) {
      const newX = this.state.x + dx;
      if (!this.checkCollision(newX, this.state.y)) {
        this.state.x = newX;
      }
    }

    if (dy !== 0) {
      const newY = this.state.y + dy;
      if (!this.checkCollision(this.state.x, newY)) {
        this.state.y = newY;
      }
    }

    if (this.state.isJumping) {
      this.state.jumpFrame++;
      
      const progress = this.state.jumpFrame / this.jumpDuration;
      const jumpOffset = Math.sin(progress * Math.PI) * this.jumpHeight * this.cellSize;
      this.state.velocityY = -jumpOffset;
      
      if (this.state.jumpFrame >= this.jumpDuration) {
        this.state.isJumping = false;
        this.state.velocityY = 0;
        this.state.squash = 1.3;
      }
    } else {
      this.state.velocityY += this.gravity;
      
      const newY = this.state.y + this.state.velocityY * deltaTime * 60;
      if (!this.checkCollision(this.state.x, newY)) {
        this.state.y = newY;
      } else {
        if (this.state.velocityY > 0) {
          this.state.squash = 0.8;
        }
        this.state.velocityY = 0;
      }
    }

    this.state.squash += (1 - this.state.squash) * 0.2;

    const worldWidth = this.world.getWidth() * this.cellSize;
    const worldHeight = this.world.getHeight() * this.cellSize;
    this.state.x = Math.max(0, Math.min(worldWidth - this.playerSize, this.state.x));
    this.state.y = Math.max(0, Math.min(worldHeight - this.playerSize, this.state.y));
  }
}
