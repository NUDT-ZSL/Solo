export interface Snowflake {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  opacity: number;
  color: string;
}

export interface WindChimeParticle {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  opacity: number;
  color: string;
}

export interface WindChime {
  id: number;
  baseX: number;
  baseY: number;
  stringLength: number;
  currentAngle: number;
  targetAngle: number;
  restSpeed: number;
  lastParticleTime: number;
}

const SNOW_COLORS = ['#ffffff', '#f0f8ff', '#e0f0ff', '#d0e8ff'];
const CHIME_PARTICLE_COLORS = ['#b0d0ff', '#c0c0ff', '#d0b0ff', '#d8c8ff'];

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomColor(colors: string[]): string {
  return colors[Math.floor(Math.random() * colors.length)];
}

export class ParticleSystem {
  private snowflakes: Snowflake[] = [];
  private chimeParticles: WindChimeParticle[] = [];
  private windChimes: WindChime[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private snowflakeIdCounter = 0;
  private chimeParticleIdCounter = 0;
  private lastSnowTime = 0;
  private lowPerformanceMode = false;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initWindChimes();
  }

  private initWindChimes(): void {
    const chimeCount = 5;
    const spacing = this.canvasWidth / (chimeCount + 1);
    for (let i = 0; i < chimeCount; i++) {
      this.windChimes.push({
        id: i,
        baseX: spacing * (i + 1),
        baseY: 80,
        stringLength: 60,
        currentAngle: 0,
        targetAngle: 0,
        restSpeed: 0.05,
        lastParticleTime: 0
      });
    }
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    const chimeCount = this.windChimes.length;
    const spacing = width / (chimeCount + 1);
    for (let i = 0; i < chimeCount; i++) {
      this.windChimes[i].baseX = spacing * (i + 1);
      this.windChimes[i].baseY = 80;
    }
  }

  public setLowPerformanceMode(mode: boolean): void {
    this.lowPerformanceMode = mode;
  }

  public spawnSnowflake(): void {
    if (this.lowPerformanceMode) return;
    this.snowflakes.push({
      id: this.snowflakeIdCounter++,
      x: randomRange(0, this.canvasWidth),
      y: -10,
      radius: randomRange(2, 4),
      speed: randomRange(0.3, 1.0),
      angle: randomRange(-15, 15) * (Math.PI / 180),
      opacity: randomRange(0.6, 1.0),
      color: randomColor(SNOW_COLORS)
    });
  }

  public updateSnowflakes(deltaTime: number): void {
    const dt = deltaTime / 16.67;
    for (let i = this.snowflakes.length - 1; i >= 0; i--) {
      const s = this.snowflakes[i];
      s.x += Math.sin(s.angle) * s.speed * dt;
      s.y += s.speed * dt;
      s.angle += randomRange(-0.02, 0.02) * dt;
      if (s.y > this.canvasHeight + 20 || s.x < -20 || s.x > this.canvasWidth + 20) {
        this.snowflakes.splice(i, 1);
      }
    }
  }

  public getSnowflakes(): Snowflake[] {
    return this.snowflakes;
  }

  public updateWindChimes(mouseX: number, mouseY: number, mouseSpeed: number, currentTime: number): void {
    const maxAngle = (15 * Math.PI) / 180;
    for (const chime of this.windChimes) {
      const dx = mouseX - chime.baseX;
      const dy = mouseY - chime.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influence = Math.max(0, 1 - dist / Math.max(this.canvasWidth, this.canvasHeight));
      const direction = dx >= 0 ? 1 : -1;
      const speedFactor = Math.min(mouseSpeed / 15, 1.5);
      chime.targetAngle = direction * maxAngle * influence * (0.3 + speedFactor * 0.7);
      const diff = chime.targetAngle - chime.currentAngle;
      chime.currentAngle += diff * chime.restSpeed;
      chime.currentAngle *= 0.98;

      const particleRate = this.lowPerformanceMode ? 0 : 1000 / randomRange(3, 5);
      if (currentTime - chime.lastParticleTime > particleRate) {
        this.spawnChimeParticle(chime);
        chime.lastParticleTime = currentTime;
      }
    }
  }

  private spawnChimeParticle(chime: WindChime): void {
    if (this.lowPerformanceMode) return;
    const endX = chime.baseX + Math.sin(chime.currentAngle) * chime.stringLength;
    const endY = chime.baseY + Math.cos(chime.currentAngle) * chime.stringLength;
    const angle = chime.currentAngle + randomRange(-0.5, 0.5);
    const speed = randomRange(0.5, 1.0);
    this.chimeParticles.push({
      id: this.chimeParticleIdCounter++,
      x: endX + randomRange(-4, 4),
      y: endY + randomRange(-4, 4),
      radius: randomRange(1, 3),
      vx: Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed * 0.5 + 0.2,
      life: randomRange(1, 2),
      maxLife: 2,
      opacity: randomRange(0.5, 0.8),
      color: randomColor(CHIME_PARTICLE_COLORS)
    });
  }

  public updateChimeParticles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (let i = this.chimeParticles.length - 1; i >= 0; i--) {
      const p = this.chimeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.01;
      p.life -= dt;
      p.opacity = Math.max(0, (p.life / p.maxLife) * 0.8);
      if (p.life <= 0 || p.y > this.canvasHeight) {
        this.chimeParticles.splice(i, 1);
      }
    }
  }

  public getChimeParticles(): WindChimeParticle[] {
    return this.chimeParticles;
  }

  public getWindChimes(): WindChime[] {
    return this.windChimes;
  }

  public getSnowSpawnInterval(): number {
    const baseInterval = 1000 / 10;
    return this.lowPerformanceMode ? 99999 : baseInterval + randomRange(-100, 100);
  }

  public shouldSpawnSnow(currentTime: number): boolean {
    if (currentTime - this.lastSnowTime >= this.getSnowSpawnInterval()) {
      this.lastSnowTime = currentTime;
      return true;
    }
    return false;
  }
}
