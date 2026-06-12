import Phaser from 'phaser';

export enum CreatureType {
  BUTTERFLY = 'butterfly',
  BEE = 'bee',
  BEETLE = 'beetle',
  FIREFLY = 'firefly',
}

export enum CreatureState {
  CURIOUS = 'curious',
  APPROACHING = 'approaching',
  INTERACTING = 'interacting',
  STARTLED = 'startled',
}

interface CreatureConfig {
  type: CreatureType;
  color: number;
  trailColor: number;
  size: number;
  orbitSpeed: number;
  spawnSound: (scene: Phaser.Scene) => void;
}

const CREATURE_CONFIGS: Record<CreatureType, CreatureConfig> = {
  [CreatureType.BUTTERFLY]: {
    type: CreatureType.BUTTERFLY,
    color: 0xff69b4,
    trailColor: 0xda70d6,
    size: 10,
    orbitSpeed: 0.8,
    spawnSound: (scene) => {
      playTone(scene, 440, 0.5, 'sine', 0.3);
    },
  },
  [CreatureType.BEE]: {
    type: CreatureType.BEE,
    color: 0xffd700,
    trailColor: 0xffa500,
    size: 8,
    orbitSpeed: 1.2,
    spawnSound: (scene) => {
      playTone(scene, 200, 1.0, 'sawtooth', 0.2);
    },
  },
  [CreatureType.BEETLE]: {
    type: CreatureType.BEETLE,
    color: 0x8b4513,
    trailColor: 0xa52a2a,
    size: 12,
    orbitSpeed: 0.5,
    spawnSound: (scene) => {
      playTone(scene, 80, 0.8, 'triangle', 0.3);
    },
  },
  [CreatureType.FIREFLY]: {
    type: CreatureType.FIREFLY,
    color: 0x00ffff,
    trailColor: 0xe0ffff,
    size: 6,
    orbitSpeed: 1.5,
    spawnSound: (scene) => {
      for (let i = 0; i < 3; i++) {
        scene.time.delayedCall(i * 150, () => {
          const freq = 800 + Math.random() * 1200;
          playTone(scene, freq, 0.3, 'sine', 0.15);
        });
      }
    },
  },
};

function playTone(
  scene: Phaser.Scene,
  freq: number,
  duration: number,
  type: OscillatorType,
  volume: number
): void {
  try {
    const ctx = (scene.game.config as any).audioContext as AudioContext;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export class Creature {
  private scene: Phaser.Scene;
  private config: CreatureConfig;
  private state: CreatureState = CreatureState.CURIOUS;
  private sprite: Phaser.GameObjects.Arc;
  private trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private stateTimer: number = 0;
  private lifespan: number = 0;
  private maxLifespan: number = 0;
  private orbitAngle: number = 0;
  private orbitRadius: number = 50;
  private targetX: number = 0;
  private targetY: number = 0;
  private isAlive: boolean = true;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, type: CreatureType, spawnX: number, spawnY: number, targetX: number, targetY: number, orbitRadius: number) {
    this.scene = scene;
    this.config = CREATURE_CONFIGS[type];
    this.targetX = targetX;
    this.targetY = targetY;
    this.orbitRadius = orbitRadius;
    this.maxLifespan = Phaser.Math.Between(5000, 8000);
    this.lifespan = 0;

    this.container = scene.add.container(spawnX, spawnY);

    this.sprite = scene.add.arc(0, 0, this.config.size, 0, 360, false, this.config.color);
    this.container.add(this.sprite);

    this.config.spawnSound(scene);

    this.enterApproaching(spawnX, spawnY, targetX, targetY);
  }

  private enterApproaching(fromX: number, fromY: number, toX: number, toY: number): void {
    this.state = CreatureState.APPROACHING;

    const cp1x = Phaser.Math.Linear(fromX, toX, 0.25) + Phaser.Math.Between(-80, 80);
    const cp1y = Phaser.Math.Linear(fromY, toY, 0.25) + Phaser.Math.Between(-80, 80);
    const cp2x = Phaser.Math.Linear(fromX, toX, 0.75) + Phaser.Math.Between(-80, 80);
    const cp2y = Phaser.Math.Linear(fromY, toY, 0.75) + Phaser.Math.Between(-80, 80);

    const path = new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(fromX, fromY),
      new Phaser.Math.Vector2(cp1x, cp1y),
      new Phaser.Math.Vector2(cp2x, cp2y),
      new Phaser.Math.Vector2(toX, toY)
    );

    const tweenObj = { t: 0 };
    this.scene.tweens.add({
      targets: tweenObj,
      t: 1,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const point = path.getPoint(tweenObj.t);
        this.container.setPosition(point.x, point.y);
      },
      onComplete: () => {
        this.enterInteracting();
      },
    });
  }

  private enterInteracting(): void {
    this.state = CreatureState.INTERACTING;
    this.startTrail();
    this.stateTimer = 0;
  }

  enterStartled(): void {
    if (this.state === CreatureState.STARTLED) return;
    this.state = CreatureState.STARTLED;
    this.stopTrail();

    const fleeAngle = Math.random() * Math.PI * 2;
    const fleeDist = 200;

    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + Math.cos(fleeAngle) * fleeDist,
      y: this.container.y + Math.sin(fleeAngle) * fleeDist,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.isAlive = false;
        this.destroy();
      },
    });
  }

  private startTrail(): void {
    const trailKey = `trail_${this.config.type}`;
    if (!this.scene.textures.exists(trailKey)) {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(this.config.trailColor, 0.6);
      gfx.fillCircle(3, 3, 3);
      gfx.generateTexture(trailKey, 6, 6);
      gfx.destroy();
    }

    if (this.trailParticles) {
      this.trailParticles.destroy();
    }

    this.trailParticles = this.scene.add.particles(
      this.container.x,
      this.container.y,
      trailKey,
      {
        speed: { min: 5, max: 15 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 800,
        quantity: 1,
        frequency: 100,
        blendMode: 'ADD',
        emitting: true,
      }
    );
  }

  private stopTrail(): void {
    if (this.trailParticles) {
      this.trailParticles.stopEmitter();
    }
  }

  update(delta: number): void {
    if (!this.isAlive) return;

    if (this.state === CreatureState.INTERACTING) {
      this.stateTimer += delta;
      this.lifespan += delta;

      this.orbitAngle += (this.config.orbitSpeed * delta) / 1000;
      const ox = this.targetX + Math.cos(this.orbitAngle) * this.orbitRadius;
      const oy = this.targetY + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.container.setPosition(ox, oy);

      if (this.trailParticles) {
        this.trailParticles.setPosition(ox, oy);
      }

      if (this.lifespan >= this.maxLifespan) {
        this.fadeOut();
      }
    }
  }

  private fadeOut(): void {
    this.stopTrail();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.isAlive = false;
        this.destroy();
      },
    });
  }

  getState(): CreatureState {
    return this.state;
  }

  getIsAlive(): boolean {
    return this.isAlive;
  }

  getType(): CreatureType {
    return this.config.type;
  }

  destroy(): void {
    this.isAlive = false;
    if (this.trailParticles) {
      this.trailParticles.destroy();
      this.trailParticles = null;
    }
    this.container.destroy();
  }
}
