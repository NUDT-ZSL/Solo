import type { AsteroidState } from '../../types';
import { ORE_COLORS } from '../../types';
import { ParticleSystem } from './particleSystem';

export class Asteroid {
  private state: AsteroidState;
  
  constructor(initialState: AsteroidState) {
    this.state = { ...initialState };
  }
  
  getState(): AsteroidState {
    return { ...this.state };
  }
  
  update(serverState: AsteroidState): void {
    this.state.x = serverState.x;
    this.state.y = serverState.y;
    this.state.size = serverState.size;
    this.state.type = serverState.type;
    this.state.volume = serverState.volume;
    this.state.vertices = serverState.vertices;
  }
  
  mine(amount: number, particleSystem: ParticleSystem): boolean {
    this.state.volume -= amount;
    
    if (Math.random() < 0.1) {
      const color = ORE_COLORS[this.state.type];
      particleSystem.spawnDebrisParticles(this.state.x, this.state.y, color, 1);
    }
    
    return this.state.volume <= 0;
  }
  
  destroy(particleSystem: ParticleSystem): void {
    const color = ORE_COLORS[this.state.type];
    particleSystem.spawnDebrisParticles(this.state.x, this.state.y, color, 4);
    particleSystem.spawnShockwave(this.state.x, this.state.y);
  }
  
  isNearPlayer(playerX: number, playerY: number, distance: number = 80): boolean {
    return Math.hypot(this.state.x - playerX, this.state.y - playerY) < distance;
  }
  
  getColor(): string {
    return ORE_COLORS[this.state.type];
  }
  
  getPolygonPoints(centerX: number, centerY: number, scale: number = 1): { x: number; y: number }[] {
    return this.state.vertices.map(v => ({
      x: centerX + Math.cos(v.angle) * this.state.size * v.radius * scale,
      y: centerY + Math.sin(v.angle) * this.state.size * v.radius * scale
    }));
  }
}
