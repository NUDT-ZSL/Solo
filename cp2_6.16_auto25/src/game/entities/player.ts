import type { PlayerState } from '../../types';
import { ParticleSystem } from './particleSystem';

export class Player {
  private state: PlayerState;
  private targetX: number;
  private targetY: number;
  private lastFlameTime: number = 0;
  
  constructor(initialState: PlayerState) {
    this.state = { ...initialState };
    this.targetX = initialState.x;
    this.targetY = initialState.y;
  }
  
  getState(): PlayerState {
    return { ...this.state };
  }
  
  update(serverState: PlayerState, deltaTime: number, particleSystem: ParticleSystem): void {
    this.targetX = serverState.x;
    this.targetY = serverState.y;
    
    this.state.x += (this.targetX - this.state.x) * 0.2;
    this.state.y += (this.targetY - this.state.y) * 0.2;
    
    this.state.vx = serverState.vx;
    this.state.vy = serverState.vy;
    this.state.rotation = serverState.rotation;
    this.state.shield = serverState.shield;
    this.state.maxShield = serverState.maxShield;
    this.state.cargo = [...serverState.cargo];
    this.state.cargoCapacity = serverState.cargoCapacity;
    this.state.miningSpeed = serverState.miningSpeed;
    this.state.level = serverState.level;
    this.state.targetAsteroid = serverState.targetAsteroid;
    this.state.miningProgress = serverState.miningProgress;
    this.state.score = serverState.score;
    this.state.asteroidsMined = serverState.asteroidsMined;
    this.state.damaged = serverState.damaged;
    
    if (Math.abs(this.state.vx) > 5 || Math.abs(this.state.vy) > 5) {
      const now = Date.now();
      if (now - this.lastFlameTime > 30) {
        particleSystem.spawnFlameParticles(
          this.state.x,
          this.state.y,
          this.state.rotation,
          this.state.color,
          2
        );
        this.lastFlameTime = now;
      }
    }
  }
  
  move(keys: Record<string, boolean>, deltaTime: number): void {
    const speed = 150;
    let targetVx = 0;
    let targetVy = 0;
    
    if (keys['w'] || keys['ArrowUp']) targetVy -= speed;
    if (keys['s'] || keys['ArrowDown']) targetVy += speed;
    if (keys['a'] || keys['ArrowLeft']) targetVx -= speed;
    if (keys['d'] || keys['ArrowRight']) targetVx += speed;
    
    this.state.vx += (targetVx - this.state.vx) * 0.2;
    this.state.vy += (targetVy - this.state.vy) * 0.2;
    
    this.state.x += this.state.vx * deltaTime;
    this.state.y += this.state.vy * deltaTime;
    
    if (Math.abs(this.state.vx) > 0.1 || Math.abs(this.state.vy) > 0.1) {
      this.state.rotation = Math.atan2(this.state.vy, this.state.vx);
    }
  }
  
  takeDamage(amount: number): void {
    this.state.shield = Math.max(0, this.state.shield - amount);
    this.state.damaged = true;
  }
  
  upgrade(upgradeType: 'cargo' | 'shield' | 'mining'): void {
    switch (upgradeType) {
      case 'cargo':
        this.state.cargoCapacity += 5;
        break;
      case 'shield':
        this.state.maxShield = 150;
        this.state.shield = 150;
        break;
      case 'mining':
        this.state.miningSpeed = 0.15;
        break;
    }
    this.state.level++;
  }
  
  getCargoCount(): Record<string, number> {
    const counts: Record<string, number> = { iron: 0, copper: 0, crystal: 0 };
    this.state.cargo.forEach(ore => {
      counts[ore] = (counts[ore] || 0) + 1;
    });
    return counts;
  }
  
  canAffordUpgrade(cost: { iron?: number; copper?: number; crystal?: number }): boolean {
    const counts = this.getCargoCount();
    if (cost.iron && counts.iron < cost.iron) return false;
    if (cost.copper && counts.copper < cost.copper) return false;
    if (cost.crystal && counts.crystal < cost.crystal) return false;
    return true;
  }
}
