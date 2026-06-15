import type { Platform, Spike, Coin } from './engine';

export interface WorldData {
  platforms: Platform[];
  spikes: Spike[];
  coins: Coin[];
  worldWidth: number;
  worldHeight: number;
  spawnX: number;
  spawnY: number;
}

export class WorldGenerator {
  private rng: () => number;

  constructor() {
    this.rng = Math.random;
  }

  private rand(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(this.rand(min, max + 1));
  }

  generate(seed?: number): WorldData {
    if (seed !== undefined) {
      let s = seed;
      this.rng = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
      };
    } else {
      this.rng = Math.random;
    }

    const platforms: Platform[] = [];
    const spikes: Spike[] = [];
    const coins: Coin[] = [];

    const worldHeight = 720;
    const worldWidth = 8000;
    const groundY = worldHeight - 120;

    platforms.push({
      x: 0,
      y: groundY,
      w: 400,
      h: 120,
      type: 'platform',
    });

    const spawnX = 100;
    const spawnY = groundY - 80;

    let lastX = 400;
    let lastY = groundY;

    while (lastX < worldWidth - 600) {
      const gapMin = 90;
      const gapMax = 220;
      const gap = this.rand(gapMin, gapMax);

      const heightChange = this.rand(-100, 80);
      let platY = lastY + heightChange;
      platY = Math.max(worldHeight - 380, Math.min(worldHeight - 80, platY));

      const platW = this.rand(120, 320);
      const platX = lastX + gap;

      platforms.push({
        x: platX,
        y: platY,
        w: platW,
        h: worldHeight - platY,
        type: 'platform',
      });

      if (this.rand(0, 1) < 0.45) {
        const floatY = platY - this.rand(90, 180);
        const floatW = this.rand(80, 180);
        const floatX = platX + this.rand(0, platW - floatW);
        if (floatY > 150) {
          platforms.push({
            x: floatX,
            y: floatY,
            w: floatW,
            h: 24,
            type: 'platform',
          });

          if (this.rand(0, 1) < 0.7) {
            const coinCount = this.randInt(1, 3);
            for (let i = 0; i < coinCount; i++) {
              coins.push({
                x: floatX + (floatW - 30) / (coinCount + 1) * (i + 1),
                y: floatY - 50,
                w: 28,
                h: 28,
                type: 'coin',
                collected: false,
                animPhase: this.rand(0, Math.PI * 2),
              });
            }
          }
        }
      }

      if (this.rand(0, 1) < 0.35 && platW > 150) {
        const spikeCount = this.randInt(1, Math.min(3, Math.floor(platW / 70)));
        const spikeStartX = platX + 30;
        const spikeSpacing = (platW - 60) / (spikeCount + 1);
        for (let i = 0; i < spikeCount; i++) {
          spikes.push({
            x: spikeStartX + spikeSpacing * (i + 1) - 18,
            y: platY - 32,
            w: 36,
            h: 32,
            type: 'spike',
          });
        }
      }

      if (this.rand(0, 1) < 0.6) {
        const coinCount = this.randInt(1, 4);
        const coinStartX = platX + 20;
        const coinSpacing = (platW - 40) / (coinCount + 1);
        for (let i = 0; i < coinCount; i++) {
          coins.push({
            x: coinStartX + coinSpacing * (i + 1) - 14,
            y: platY - 60 - this.rand(0, 40),
            w: 28,
            h: 28,
            type: 'coin',
            collected: false,
            animPhase: this.rand(0, Math.PI * 2),
          });
        }
      }

      lastX = platX + platW;
      lastY = platY;
    }

    platforms.push({
      x: lastX + 80,
      y: groundY,
      w: 800,
      h: 120,
      type: 'platform',
    });

    return {
      platforms,
      spikes,
      coins,
      worldWidth,
      worldHeight,
      spawnX,
      spawnY,
    };
  }

  reset(): WorldData {
    return this.generate(Math.floor(Math.random() * 1000000));
  }
}
