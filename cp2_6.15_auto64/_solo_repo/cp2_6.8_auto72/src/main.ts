import { Pet, type PetAction } from './pet';
import { ParticleSystem } from './particles';
import { UIManager } from './ui';

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pet: Pet;
  private particles: ParticleSystem;
  private ui: UIManager;
  private lastTime: number;
  private clouds: Cloud[];
  private zzzTimer: number;
  private particleTimer: number;
  private readonly WIDTH = 320;
  private readonly HEIGHT = 400;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.pet = new Pet(this.WIDTH / 2, this.HEIGHT / 2 + 50);
    this.particles = new ParticleSystem();
    this.ui = new UIManager();
    this.lastTime = 0;
    this.zzzTimer = 0;
    this.particleTimer = 0;
    this.clouds = this.initClouds();

    this.ui.setOnActionCallback((action: PetAction) => {
      if (this.ui.isActionReady(action)) {
        this.handleAction(action);
      }
    });
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  private loop(currentTime: number): void {
    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((time) => this.loop(time));
  }

  private update(dt: number): void {
    this.pet.update(dt);
    this.particles.update(dt);
    this.ui.updateStats(this.pet.stats);
    this.ui.updateCooldowns(dt);

    this.updateClouds(dt);

    if (this.pet.action === 'sleep') {
      this.zzzTimer += dt;
      if (this.zzzTimer >= 0.6) {
        this.zzzTimer = 0;
        this.particles.spawnZzz(this.pet.x, this.pet.getTopY() - 10);
      }
    }

    if (this.pet.action === 'clean') {
      this.particleTimer += dt;
      if (this.particleTimer >= 0.5) {
        this.particleTimer = 0;
        this.particles.spawnWaterParticles(this.pet.x, this.pet.y);
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

    this.renderBackground();

    this.particles.render(this.ctx);
    this.pet.render(this.ctx);
  }

  private renderBackground(): void {
    const highEnergy = this.pet.stats.energy > 50;

    if (highEnergy) {
      this.ctx.fillStyle = '#E8F5E9';
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
      this.renderClouds();
      this.renderGrass();
    } else {
      this.ctx.fillStyle = '#263238';
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
      this.renderLightBulb();
    }
  }

  private renderGrass(): void {
    const groundY = this.HEIGHT - 60;
    this.ctx.fillStyle = '#A5D6A7';
    this.ctx.fillRect(0, groundY, this.WIDTH, 60);

    this.ctx.strokeStyle = '#81C784';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < this.WIDTH; i += 12) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, groundY + 5);
      this.ctx.lineTo(i + 3, groundY - 5);
      this.ctx.lineTo(i + 6, groundY + 5);
      this.ctx.stroke();
    }
  }

  private initClouds(): Cloud[] {
    const clouds: Cloud[] = [];
    for (let i = 0; i < 3; i++) {
      clouds.push({
        x: Math.random() * this.WIDTH,
        y: 40 + i * 50,
        size: 30 + Math.random() * 20,
        speed: 8 + Math.random() * 8
      });
    }
    return clouds;
  }

  private updateClouds(dt: number): void {
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x - cloud.size > this.WIDTH) {
        cloud.x = -cloud.size;
      }
    }
  }

  private renderClouds(): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (const cloud of this.clouds) {
      this.ctx.beginPath();
      this.ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
      this.ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.15, cloud.size * 0.4, 0, Math.PI * 2);
      this.ctx.arc(cloud.x + cloud.size * 0.7, cloud.y, cloud.size * 0.35, 0, Math.PI * 2);
      this.ctx.arc(cloud.x - cloud.size * 0.3, cloud.y + cloud.size * 0.05, cloud.size * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private renderLightBulb(): void {
    const bulbX = this.WIDTH / 2;
    const bulbY = 50;

    this.ctx.strokeStyle = '#546E7A';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(bulbX, 0);
    this.ctx.lineTo(bulbX, bulbY - 15);
    this.ctx.stroke();

    const gradient = this.ctx.createRadialGradient(bulbX, bulbY, 5, bulbX, bulbY, 60);
    gradient.addColorStop(0, 'rgba(255, 235, 59, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(bulbX, bulbY, 60, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFF176';
    this.ctx.beginPath();
    this.ctx.arc(bulbX, bulbY, 15, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#90A4AE';
    this.ctx.fillRect(bulbX - 8, bulbY - 20, 16, 8);

    this.ctx.strokeStyle = '#78909C';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(bulbX - 6, bulbY - 18 + i * 2);
      this.ctx.lineTo(bulbX + 6, bulbY - 18 + i * 2);
      this.ctx.stroke();
    }
  }

  private handleAction(action: PetAction): void {
    this.pet.performAction(action);
    this.ui.triggerCooldown(action);

    switch (action) {
      case 'feed':
        this.particles.spawnFoodParticles(this.pet.x, this.pet.getTopY());
        break;
      case 'clean':
        this.particles.spawnWaterParticles(this.pet.x, this.pet.y);
        break;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
