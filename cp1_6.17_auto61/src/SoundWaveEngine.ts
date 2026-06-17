import { Wall, Gem } from './MazeGen';

export interface SoundWave {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  opacity: number;
  startOpacity: number;
  endOpacity: number;
  reflections: number;
  active: boolean;
  color: string;
  hitWallIds: Set<number>;
  life: number;
  maxLife: number;
}

export interface WaveGemHit {
  gemId: number;
  waveId: number;
}

export class SoundWaveEngine {
  private waves: SoundWave[] = [];
  private walls: Wall[] = [];
  private gems: Gem[] = [];
  private nextWaveId = 0;
  private gemHitThisFrame: WaveGemHit[] = [];
  private readonly SPEED = 120;
  private readonly MAX_REFLECTIONS = 2;
  private readonly REFLECTION_RATIO = 0.4;
  private readonly SHORT_MAX_RADIUS = 90;
  private readonly SHORT_DURATION = 0.6;
  private readonly LONG_MAX_RADIUS = 160;
  private readonly LONG_DURATION = 1.2;
  private readonly PRIMARY_COLOR = '#FF8800';
  private readonly REFLECTED_COLOR = '#44AAFF';

  setWalls(walls: Wall[]): void {
    this.walls = walls;
  }

  setGems(gems: Gem[]): void {
    this.gems = gems;
  }

  emitPulse(x: number, y: number, isLong: boolean): void {
    const maxRadius = isLong ? this.LONG_MAX_RADIUS : this.SHORT_MAX_RADIUS;
    const duration = isLong ? this.LONG_DURATION : this.SHORT_DURATION;
    const startOpacity = isLong ? 0.5 : 0.6;
    const endOpacity = isLong ? 0.1 : 0.05;

    this.waves.push({
      id: this.nextWaveId++,
      x,
      y,
      radius: 0,
      maxRadius,
      speed: this.SPEED,
      opacity: startOpacity,
      startOpacity,
      endOpacity,
      reflections: 0,
      active: true,
      color: this.PRIMARY_COLOR,
      hitWallIds: new Set<number>(),
      life: 0,
      maxLife: duration
    });
  }

  update(deltaTime: number): WaveGemHit[] {
    this.gemHitThisFrame = [];

    const activeWaves = this.waves.filter(w => w.active);
    const newWaves: SoundWave[] = [];

    for (const wave of activeWaves) {
      wave.life += deltaTime;
      const progress = Math.min(wave.life / wave.maxLife, 1);
      wave.radius = wave.maxRadius * progress;
      wave.opacity =
        wave.startOpacity + (wave.endOpacity - wave.startOpacity) * progress;

      if (wave.life >= wave.maxLife) {
        wave.active = false;
        continue;
      }

      if (wave.reflections < this.MAX_REFLECTIONS) {
        const reflections = this.checkWallReflections(wave);
        for (const reflectedWave of reflections) {
          newWaves.push(reflectedWave);
        }
      }

      this.checkGemCollisions(wave);
    }

    for (const nw of newWaves) {
      this.waves.push(nw);
    }

    this.waves = this.waves.filter(w => w.active);

    return this.gemHitThisFrame;
  }

  private checkWallReflections(wave: SoundWave): SoundWave[] {
    const reflections: SoundWave[] = [];

    for (let i = 0; i < this.walls.length; i++) {
      if (wave.hitWallIds.has(i)) continue;

      const wall = this.walls[i];
      const collision = this.circleRectIntersect(
        wave.x,
        wave.y,
        wave.radius,
        wall
      );

      if (collision.intersects) {
        wave.hitWallIds.add(i);

        const newMaxRadius = wave.maxRadius * this.REFLECTION_RATIO;
        const newDuration = wave.maxLife * this.REFLECTION_RATIO;

        const reflectedWave: SoundWave = {
          id: this.nextWaveId++,
          x: collision.point.x,
          y: collision.point.y,
          radius: 0,
          maxRadius: newMaxRadius,
          speed: this.SPEED,
          opacity: wave.startOpacity * this.REFLECTION_RATIO,
          startOpacity: wave.startOpacity * this.REFLECTION_RATIO,
          endOpacity: wave.endOpacity * this.REFLECTION_RATIO,
          reflections: wave.reflections + 1,
          active: true,
          color: this.REFLECTED_COLOR,
          hitWallIds: new Set<number>([i]),
          life: 0,
          maxLife: newDuration
        };

        reflections.push(reflectedWave);
      }
    }

    return reflections;
  }

  private circleRectIntersect(
    cx: number,
    cy: number,
    r: number,
    rect: Wall
  ): { intersects: boolean; point: { x: number; y: number } } {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));

    const dx = cx - closestX;
    const dy = cy - closestY;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq < r * r) {
      return {
        intersects: true,
        point: { x: closestX, y: closestY }
      };
    }

    return { intersects: false, point: { x: 0, y: 0 } };
  }

  private checkGemCollisions(wave: SoundWave): void {
    for (const gem of this.gems) {
      if (gem.collected) continue;

      const dx = gem.x - wave.x;
      const dy = gem.y - wave.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= wave.radius && distance >= wave.radius - 15) {
        const alreadyHit = this.gemHitThisFrame.some(
          h => h.gemId === gem.id && h.waveId === wave.id
        );
        if (!alreadyHit) {
          this.gemHitThisFrame.push({ gemId: gem.id, waveId: wave.id });
        }
      }
    }
  }

  getWaves(): SoundWave[] {
    return this.waves.filter(w => w.active);
  }

  reset(): void {
    this.waves = [];
    this.nextWaveId = 0;
    this.gemHitThisFrame = [];
  }
}
