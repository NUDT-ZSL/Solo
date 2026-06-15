import { Particle, TimelineEvent, PlaybackState } from './types';
import { lerp, easeInOutCubic, easeInQuad, clamp } from './animation';

const MAX_PARTICLES = 500;
const DEFAULT_LIFETIME = 8;
const DEFAULT_FALL_DURATION = 0.8;
const PARTICLES_PER_EVENT_DESKTOP = 30;
const PARTICLES_PER_EVENT_MOBILE = 20;
const BASE_SPAWN_INTERVAL = 0.8;
const CANVAS_CENTER_Y = 250;
const CANVAS_TIMELINE_BOTTOM = 120;

export class ParticleSystem {
  private pool: Particle[] = [];
  private nextParticleId = 0;
  private isMobile: boolean;
  private spawnCounters: Map<string, number> = new Map();
  private perEventCount: number;

  constructor(isMobile: boolean = false) {
    this.isMobile = isMobile;
    this.perEventCount = isMobile ? PARTICLES_PER_EVENT_MOBILE : PARTICLES_PER_EVENT_DESKTOP;
  }

  update(dt: number, events: TimelineEvent[], playback: PlaybackState): void {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];

      if (p.transitionProgress < 1) {
        p.transitionProgress = Math.min(1, p.transitionProgress + dt / 1.5);
      }

      p.age += dt;
      if (p.age >= p.maxAge || p.fadeProgress >= 1) {
        this.pool.splice(i, 1);
        continue;
      }

      const t = easeInOutCubic(p.transitionProgress);
      p.currentStartX = lerp(p.startX, p.targetStartX, t);

      if (p.age < p.fallDuration) {
        const fallT = easeInQuad(p.age / p.fallDuration);
        p.y = lerp(CANVAS_TIMELINE_BOTTOM, CANVAS_CENTER_Y, fallT);
        p.x = p.currentStartX;
      } else {
        const tWave = p.age - p.fallDuration;
        p.y = CANVAS_CENTER_Y + Math.sin(p.wavePhase + p.waveFrequency * tWave) * p.waveAmplitude;
        p.x = p.currentStartX + p.driftSpeed * tWave;
      }

      const lifeRatio = p.age / p.maxAge;
      const baseSize = lerp(4, 1, lifeRatio);
      const baseOpacity = lerp(1, 0.2, lifeRatio);
      const fadeMul = 1 - p.fadeProgress;
      p.size = baseSize * fadeMul;
      p.opacity = baseOpacity * fadeMul;
    }

    for (const ev of events) {
      if (ev.visibility <= 0.1 || ev.cardScale <= 0.1) continue;

      const isBoost = playback.boostEventId === ev.id && playback.boostRemaining > 0;
      const spawnInterval = isBoost ? BASE_SPAWN_INTERVAL / 2 : BASE_SPAWN_INTERVAL;

      const prev = this.spawnCounters.get(ev.id) ?? 0;
      let acc = prev + dt;

      const spawnCount = isBoost ? 2 : 1;
      let spawned = 0;

      while (acc >= spawnInterval && spawned < spawnCount) {
        acc -= spawnInterval;
        if (this.pool.length < MAX_PARTICLES) {
          this.spawnParticle(ev);
          spawned++;
        } else {
          break;
        }
      }
      this.spawnCounters.set(ev.id, acc);
    }
  }

  private spawnParticle(event: TimelineEvent): void {
    while (this.pool.length >= MAX_PARTICLES) {
      this.pool.shift();
    }

    const wavePeriod = 2 + Math.random();
    const cardWidth = 80;

    const particle: Particle = {
      id: this.nextParticleId++,
      eventId: event.id,
      x: 0,
      y: 0,
      startX: event.targetPosition + cardWidth / 2,
      targetStartX: event.targetPosition + cardWidth / 2,
      transitionProgress: 1,
      age: 0,
      maxAge: DEFAULT_LIFETIME,
      fallDuration: DEFAULT_FALL_DURATION + Math.random() * 0.3 - 0.15,
      waveAmplitude: 30 + Math.random() * 30,
      waveFrequency: (2 * Math.PI) / wavePeriod,
      wavePhase: Math.random() * Math.PI * 2,
      driftSpeed: 15 + Math.random() * 10,
      size: 4,
      opacity: 1,
      color: event.color,
      fadeProgress: event.visibility < 0.9 ? 0.8 : 0,
      currentStartX: event.targetPosition + cardWidth / 2,
    };

    this.pool.push(particle);
  }

  notifyEventPositionChanged(eventId: string, newTargetX: number, newCardWidth: number = 80): void {
    for (const p of this.pool) {
      if (p.eventId !== eventId) continue;

      p.startX = p.currentStartX;
      p.targetStartX = newTargetX + newCardWidth / 2;
      p.transitionProgress = 0;
    }
  }

  updateParticleFade(dt: number, eventsById: Map<string, TimelineEvent>): void {
    for (const p of this.pool) {
      const ev = eventsById.get(p.eventId);
      if (ev) {
        const targetFade = 1 - ev.cardScale;
        const speed = 1 / 0.3;
        const delta = (targetFade - p.fadeProgress);
        const maxStep = dt * speed * 1.5;
        if (Math.abs(delta) <= maxStep) {
          p.fadeProgress = targetFade;
        } else if (delta > 0) {
          p.fadeProgress = Math.min(1, p.fadeProgress + maxStep);
        } else {
          p.fadeProgress = Math.max(0, p.fadeProgress - maxStep);
        }
      }
    }
  }

  getPool(): Particle[] {
    return this.pool;
  }

  clear(): void {
    this.pool.length = 0;
    this.nextParticleId = 0;
    this.spawnCounters.clear();
  }
}
