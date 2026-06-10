import { Rune } from './rune';

const RUNE_CHARS = [
  '☀', '☾', '★', '⚡', '❂',
  '✧', '✦', '⚶', '♆', '☌',
  '☍', '⚸', '⟟', '⌖', '⟡',
  '◈', '◇', '⬡', '⎔', '⏣'
];

export interface SteleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class RuneManager {
  runes: Rune[] = [];
  maxRunes: number = 24;
  spawnIntervalMin: number = 800;
  spawnIntervalMax: number = 2000;
  nextSpawnTime: number = 0;
  elapsedTime: number = 0;
  steleRect: SteleRect;
  speedMultiplier: number = 1;
  activatedRunes: Rune[] = [];
  lastMouseX: number = -9999;
  lastMouseY: number = -9999;

  constructor(steleRect: SteleRect) {
    this.steleRect = steleRect;
    this.nextSpawnTime = 0;
    this.spawnInitialRunes();
  }

  private spawnInitialRunes(): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      this.spawnRune();
      const rune = this.runes[this.runes.length - 1];
      const progress = (i + 1) / (count + 1);
      rune.lifeStage = 'floating';
      rune.lifeTime = progress * rune.floatDuration * 0.6;
      rune.y = this.steleRect.y + this.steleRect.h - 20 - progress * (this.steleRect.h - 60);
      rune.baseY = rune.y;
      rune.brightness = 1;
    }
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  updateSteleRect(rect: SteleRect): void {
    this.steleRect = rect;
  }

  update(dt: number, mouseX: number, mouseY: number): Rune[] {
    this.elapsedTime += dt;
    this.activatedRunes = [];

    if (this.elapsedTime >= this.nextSpawnTime) {
      this.spawnRune();
      this.nextSpawnTime = this.elapsedTime + this.getRandomSpawnInterval();
    }

    const speedDt = dt * this.speedMultiplier;

    for (let i = this.runes.length - 1; i >= 0; i--) {
      const rune = this.runes[i];
      const alive = rune.update(speedDt);

      if (
        mouseX !== this.lastMouseX ||
        mouseY !== this.lastMouseY
      ) {
        if (!rune.isActive && rune.contains(mouseX, mouseY) && rune.lifeStage !== 'fading') {
          rune.activate();
          this.activatedRunes.push(rune);
        }
      }

      if (!alive || rune.y < this.steleRect.y - rune.size) {
        this.runes.splice(i, 1);
      }
    }

    if (this.runes.length > this.maxRunes) {
      const excess = this.runes.length - this.maxRunes;
      for (let i = 0; i < excess; i++) {
        this.runes[i].fadeOut();
      }
    }

    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;

    return this.activatedRunes;
  }

  spawnRune(): void {
    const padding = 40;
    const x = this.steleRect.x + padding + Math.random() * (this.steleRect.w - padding * 2);
    const y = this.steleRect.y + this.steleRect.h - 20;

    const char = RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)];

    const rune = new Rune({
      x,
      y,
      char,
      size: 32,
      floatSpeed: 0.015 + Math.random() * 0.01,
    });

    this.runes.push(rune);
  }

  checkCollisions(px: number, py: number): Rune | null {
    for (let i = this.runes.length - 1; i >= 0; i--) {
      const rune = this.runes[i];
      if (rune.contains(px, py) && rune.lifeStage !== 'fading') {
        return rune;
      }
    }
    return null;
  }

  private getRandomSpawnInterval(): number {
    const baseMin = this.spawnIntervalMin / this.speedMultiplier;
    const baseMax = this.spawnIntervalMax / this.speedMultiplier;
    return baseMin + Math.random() * (baseMax - baseMin);
  }
}
