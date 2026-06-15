import Phaser from 'phaser';

export enum GrowthStage {
  SEED = 'seed',
  SPROUT = 'sprout',
  MATURE = 'mature',
  BLOOM = 'bloom',
}

const BLOOM_COLORS = [0xff69b4, 0xffa500, 0xffd700, 0xda70d6, 0xff4500];
const LEAF_COLOR_START = 0xb8e67c;
const LEAF_COLOR_END = 0x32cd32;

export class Plant {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private growthProgress: number = 0;
  private stage: GrowthStage = GrowthStage.SEED;
  private container: Phaser.GameObjects.Container;

  private seedBody!: Phaser.GameObjects.Ellipse;
  private stem!: Phaser.GameObjects.Rectangle;
  private cotyledons: Phaser.GameObjects.Arc[] = [];
  private leaves: Phaser.GameObjects.Arc[] = [];
  private leafCreationTimes: number[] = [];
  private readonly LEAF_COLOR_TRANSITION_MS = 3000;
  private flower!: Phaser.GameObjects.Container;
  private flowerPetals: Phaser.GameObjects.Arc[] = [];
  private glowParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private isLowEnergy: boolean = false;
  private lowEnergyTween: Phaser.Tweens.Tween | null = null;

  private readonly SEED_PULSE_PERIOD = 2000;
  private readonly STEM_GROW_DURATION = 1500;
  private readonly COTYLEDON_SPIN_DURATION = 800;
  private readonly LEAF_STAGGER = 200;
  private readonly LEAF_SPIN_DURATION = 600;
  private readonly BLOOM_SPIN_DURATION = 1000;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.container = scene.add.container(x, y);
    this.createSeed();
  }

  private createSeed(): void {
    this.seedBody = this.scene.add.ellipse(0, 0, 30, 20, 0x8b4513);
    this.container.add(this.seedBody);

    this.scene.tweens.add({
      targets: this.seedBody,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: this.SEED_PULSE_PERIOD / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createStem(): void {
    this.stem = this.scene.add.rectangle(0, -60, 6, 0, 0x228b22);
    this.stem.setOrigin(0.5, 1);
    this.stem.setPosition(0, 0);
    this.container.add(this.stem);
    this.container.sendToBack(this.stem);

    this.scene.tweens.add({
      targets: this.stem,
      height: 120,
      y: -120,
      duration: this.STEM_GROW_DURATION,
      ease: 'Cubic.easeOut',
    });
  }

  private createCotyledons(): void {
    const stemTop = -120;
    const leftCot = this.scene.add.arc(-8, stemTop, 8, 0, 360, false, 0x90ee90);
    const rightCot = this.scene.add.arc(8, stemTop, 8, 0, 360, false, 0x90ee90);

    leftCot.setAngle(-90);
    rightCot.setAngle(90);

    this.cotyledons = [leftCot, rightCot];
    this.container.add(leftCot);
    this.container.add(rightCot);

    this.scene.tweens.add({
      targets: leftCot,
      angle: 0,
      duration: this.COTYLEDON_SPIN_DURATION,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: rightCot,
      angle: 0,
      duration: this.COTYLEDON_SPIN_DURATION,
      ease: 'Back.easeOut',
    });
  }

  private createMatureStem(): void {
    if (this.stem) {
      this.scene.tweens.add({
        targets: this.stem,
        height: 200,
        y: -200,
        duration: 1500,
        ease: 'Cubic.easeOut',
      });
    }

    for (let i = 0; i < 4; i++) {
      const angle = i < 2 ? -1 : 1;
      const yOffset = -80 - i * 30;
      const xOffset = angle * 15;

      const leafColor = this.getLeafColor(0);
      const leaf = this.scene.add.arc(xOffset, yOffset, 12, 0, 360, false, leafColor);
      leaf.setScale(0);
      leaf.setAngle(angle * 45);
      this.leaves.push(leaf);
      this.leafCreationTimes.push(this.scene.time.now + i * this.LEAF_STAGGER + this.LEAF_SPIN_DURATION);
      this.container.add(leaf);

      this.scene.tweens.add({
        targets: leaf,
        scale: 1,
        duration: this.LEAF_SPIN_DURATION,
        delay: i * this.LEAF_STAGGER,
        ease: 'Back.easeOut',
      });
    }
  }

  private getLeafColor(progress: number): number {
    const r1 = (LEAF_COLOR_START >> 16) & 0xff;
    const g1 = (LEAF_COLOR_START >> 8) & 0xff;
    const b1 = LEAF_COLOR_START & 0xff;
    const r2 = (LEAF_COLOR_END >> 16) & 0xff;
    const g2 = (LEAF_COLOR_END >> 8) & 0xff;
    const b2 = LEAF_COLOR_END & 0xff;

    const r = Math.round(Phaser.Math.Linear(r1, r2, progress));
    const g = Math.round(Phaser.Math.Linear(g1, g2, progress));
    const b = Math.round(Phaser.Math.Linear(b1, b2, progress));

    return (r << 16) | (g << 8) | b;
  }

  private createFlower(): void {
    const flowerColor = Phaser.Utils.Array.GetRandom(BLOOM_COLORS);
    this.flower = this.scene.add.container(0, -200);
    this.container.add(this.flower);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const petal = this.scene.add.arc(
        Math.cos(angle) * 12,
        Math.sin(angle) * 12,
        10,
        0,
        360,
        false,
        flowerColor
      );
      petal.setAngle(0);
      this.flowerPetals.push(petal);
      this.flower.add(petal);
    }

    const center = this.scene.add.arc(0, 0, 6, 0, 360, false, 0xffffe0);
    this.flower.add(center);

    this.scene.tweens.add({
      targets: this.flower,
      angle: 360,
      duration: this.BLOOM_SPIN_DURATION,
      ease: 'Cubic.easeOut',
    });

    this.createGlowParticles();
  }

  private createGlowParticles(): void {
    const particleKey = 'glowParticle';
    if (!this.scene.textures.exists(particleKey)) {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0xffffe0, 1);
      gfx.fillCircle(8, 8, 8);
      gfx.generateTexture(particleKey, 16, 16);
      gfx.destroy();
    }

    this.glowParticles = this.scene.add.particles(this.x, this.y - 200, particleKey, {
      speed: { min: 10, max: 30 },
      scale: { start: 0.5, end: 0, ease: 'Power2' },
      lifespan: 2000,
      quantity: 1,
      frequency: 100,
      blendMode: 'ADD',
      emitting: false,
    });
    this.glowParticles.startEmitter();
  }

  update(audioFeatures: { volume: number; normalizedFrequency: Float32Array }): void {
    if (this.isLowEnergy) return;

    const energy = audioFeatures.volume;
    const freqBonus = this.computeFreqBonus(audioFeatures.normalizedFrequency);
    const growthRate = energy * (1 + freqBonus) * 0.15;
    this.growthProgress = Math.min(100, this.growthProgress + growthRate);
    this.checkStageTransition();
    this.updateLeafColors();
  }

  private updateLeafColors(): void {
    const now = this.scene.time.now;
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      const startTime = this.leafCreationTimes[i];
      if (startTime === undefined || now < startTime) continue;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / this.LEAF_COLOR_TRANSITION_MS);
      leaf.setFillStyle(this.getLeafColor(progress));
    }
  }

  private computeFreqBonus(normalizedFreq: Float32Array): number {
    if (normalizedFreq.length === 0) return 0;
    let sum = 0;
    const step = Math.max(1, Math.floor(normalizedFreq.length / 64));
    for (let i = 0; i < normalizedFreq.length; i += step) {
      sum += normalizedFreq[i];
    }
    const avg = sum / Math.ceil(normalizedFreq.length / step);
    return avg * 0.5;
  }

  private checkStageTransition(): void {
    const prevStage = this.stage;

    if (this.growthProgress < 30) {
      this.stage = GrowthStage.SEED;
    } else if (this.growthProgress < 60) {
      this.stage = GrowthStage.SPROUT;
    } else if (this.growthProgress < 90) {
      this.stage = GrowthStage.MATURE;
    } else {
      this.stage = GrowthStage.BLOOM;
    }

    if (prevStage !== this.stage) {
      this.onStageEnter(this.stage);
    }
  }

  private onStageEnter(stage: GrowthStage): void {
    switch (stage) {
      case GrowthStage.SPROUT:
        this.createStem();
        this.createCotyledons();
        break;
      case GrowthStage.MATURE:
        this.createMatureStem();
        break;
      case GrowthStage.BLOOM:
        this.createFlower();
        break;
    }
  }

  setLowEnergy(lowEnergy: boolean): void {
    if (this.isLowEnergy === lowEnergy) return;
    this.isLowEnergy = lowEnergy;

    if (lowEnergy) {
      this.applyLowEnergyEffects();
    } else {
      this.removeLowEnergyEffects();
    }
  }

  private applyLowEnergyEffects(): void {
    this.leaves.forEach(leaf => {
      const currentAngle = leaf.angle;
      this.scene.tweens.add({
        targets: leaf,
        angle: currentAngle + 5,
        duration: 500,
        ease: 'Sine.easeOut',
      });
    });
  }

  private removeLowEnergyEffects(): void {
    this.leaves.forEach(leaf => {
      const currentAngle = leaf.angle;
      this.scene.tweens.add({
        targets: leaf,
        angle: currentAngle - 5,
        duration: 1000,
        ease: 'Sine.easeOut',
      });
    });
  }

  decayProgress(): number {
    if (!this.isLowEnergy) return this.growthProgress;
    this.growthProgress = Math.max(0, this.growthProgress - 1);
    return this.growthProgress;
  }

  getProgress(): number {
    return this.growthProgress;
  }

  getStage(): GrowthStage {
    return this.stage;
  }

  reset(): void {
    this.growthProgress = 0;
    this.stage = GrowthStage.SEED;
    this.container.removeAll(true);
    this.cotyledons = [];
    this.leaves = [];
    this.leafCreationTimes = [];
    this.flowerPetals = [];
    if (this.glowParticles) {
      this.glowParticles.stopEmitter();
      this.glowParticles.destroy();
    }
    this.createSeed();
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy();
    if (this.glowParticles) {
      this.glowParticles.destroy();
    }
  }
}
