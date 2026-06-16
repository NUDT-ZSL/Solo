import { Player, Platform, Spike, GameSwitch, TimeClone, Particle } from './entities';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  phase: number;
  period: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private stars: Star[] = [];
  private cameraX: number = 0;
  private cameraY: number = 0;
  private worldWidth: number = 1200;
  private worldHeight: number = 600;
  private starCount: number = 100;
  private lowPerformanceMode: boolean = false;
  private backgroundGradient: CanvasGradient | null = null;

  constructor(ctx: CanvasRenderingContext2D, worldWidth: number = 1200, worldHeight: number = 600) {
    this.ctx = ctx;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.initStars();
    this.initBackgroundGradient();
  }

  private initStars(): void {
    this.stars = [];
    const count = this.lowPerformanceMode ? 50 : this.starCount;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight * 0.8,
        size: 1 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random() * 2
      });
    }
  }

  private initBackgroundGradient(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width
    );
    gradient.addColorStop(0, '#302b63');
    gradient.addColorStop(0.5, '#24243e');
    gradient.addColorStop(1, '#0f0c29');
    this.backgroundGradient = gradient;
  }

  setLowPerformanceMode(enabled: boolean): void {
    if (this.lowPerformanceMode !== enabled) {
      this.lowPerformanceMode = enabled;
      this.initStars();
    }
  }

  updateCamera(playerX: number, playerY: number): void {
    let targetX = playerX - this.width / 2 + 10;
    let targetY = playerY - this.height / 2 + 10;

    targetX = Math.max(0, Math.min(targetX, this.worldWidth - this.width));
    targetY = Math.max(0, Math.min(targetY, this.worldHeight - this.height));

    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraY += (targetY - this.cameraY) * 0.1;
  }

  render(
    dt: number,
    player: Player,
    platforms: Platform[],
    spikes: Spike[],
    switches: GameSwitch[],
    clones: TimeClone[],
    goal: { x: number; y: number },
    time: number
  ): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawStars(time);

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    this.drawGoal(goal, time);
    this.drawPlatforms(platforms);
    this.drawSwitches(switches);
    this.drawSpikes(spikes);
    this.drawClones(clones);
    this.drawPlayer(player);

    this.ctx.restore();
  }

  private drawBackground(): void {
    if (this.backgroundGradient) {
      this.ctx.fillStyle = this.backgroundGradient;
    } else {
      this.ctx.fillStyle = '#0f0c29';
    }
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(time: number): void {
    for (const star of this.stars) {
      const parallaxX = (star.x - this.cameraX * 0.3) % this.width;
      const parallaxY = (star.y - this.cameraY * 0.3) % this.height;
      
      const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time / star.period * Math.PI * 2 + star.phase));
      const alpha = star.brightness * brightness;

      this.ctx.beginPath();
      this.ctx.arc(parallaxX, parallaxY, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fill();
    }
  }

  private drawPlatforms(platforms: Platform[]): void {
    for (const platform of platforms) {
      this.ctx.fillStyle = '#2d3436';
      this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(platform.x, platform.y, platform.width, 2);

      if (platform.movable) {
        this.ctx.strokeStyle = '#ffa502';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      }
    }
  }

  private drawPlayer(player: Player): void {
    this.ctx.save();
    this.ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    this.ctx.scale(1, player.scaleY);

    this.ctx.shadowColor = '#00d2ff';
    this.ctx.shadowBlur = 15;

    this.ctx.fillStyle = '#00d2ff';
    this.ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-player.width / 2, -player.height / 2, player.width, player.height);

    this.ctx.restore();
  }

  private drawClones(clones: TimeClone[]): void {
    for (const clone of clones) {
      if (clone.dissipating) {
        this.drawDissipateParticles(clone.particles);
      } else {
        this.ctx.save();
        this.ctx.globalAlpha = clone.opacity;

        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(clone.x, clone.y, 20, 20);

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(clone.x, clone.y, 20, 20);

        this.ctx.restore();
      }
    }
  }

  private drawDissipateParticles(particles: Particle[]): void {
    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      this.ctx.fillStyle = `rgba(255, 107, 107, ${alpha})`;
      this.ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }
  }

  private drawSpikes(spikes: Spike[]): void {
    for (const spike of spikes) {
      this.ctx.fillStyle = '#ff4757';
      this.ctx.beginPath();
      this.ctx.moveTo(spike.x, spike.y + spike.height);
      this.ctx.lineTo(spike.x + spike.width / 2, spike.y);
      this.ctx.lineTo(spike.x + spike.width, spike.y + spike.height);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.moveTo(spike.x + 2, spike.y + spike.height - 4);
      this.ctx.lineTo(spike.x + spike.width / 2, spike.y + 4);
      this.ctx.lineTo(spike.x + spike.width / 2 + 2, spike.y + 4);
      this.ctx.lineTo(spike.x + 4, spike.y + spike.height - 4);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawSwitches(switches: GameSwitch[]): void {
    for (const sw of switches) {
      this.ctx.fillStyle = sw.activated ? '#2ed573' : '#ffa502';
      this.ctx.fillRect(sw.x, sw.y, sw.width, sw.height);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fillRect(sw.x, sw.y, sw.width, 2);

      if (!sw.activated) {
        this.ctx.shadowColor = '#ffa502';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#ffa502';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(sw.x, sw.y, sw.width, sw.height);
        this.ctx.shadowBlur = 0;
      }
    }
  }

  private drawGoal(goal: { x: number; y: number }, time: number): void {
    const pulse = 0.8 + 0.2 * Math.sin(time * 3);

    this.ctx.save();
    this.ctx.shadowColor = '#2ed573';
    this.ctx.shadowBlur = 20 * pulse;

    this.ctx.fillStyle = '#2ed573';
    this.ctx.fillRect(goal.x, goal.y, 30, 30);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillRect(goal.x + 5, goal.y + 5, 20, 20);

    this.ctx.fillStyle = '#2ed573';
    this.ctx.fillRect(goal.x + 10, goal.y + 10, 10, 10);

    this.ctx.restore();
  }

  getCameraX(): number {
    return this.cameraX;
  }

  getCameraY(): number {
    return this.cameraY;
  }

  resetCamera(): void {
    this.cameraX = 0;
    this.cameraY = 0;
  }

  updateWorldSize(width: number, height: number): void {
    this.worldWidth = width;
    this.worldHeight = height;
    this.initStars();
  }
}
