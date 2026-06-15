import Phaser from 'phaser';
import { AudioAnalyzer, AudioFeatures } from '../audio/AudioAnalyzer';
import { Plant, GrowthStage } from '../entities/Plant';
import { Creature, CreatureType, CreatureState } from '../entities/Creature';
import { HUD } from '../ui/HUD';

const DECAY_INTERVAL = 5000;
const DECAY_AMOUNT = 1;
const LOW_ENERGY_TRANSITION_DURATION = 1000;
const CELEBRATION_DURATION = 15000;
const CELEBRATION_RING_PERIOD = 6000;
const MAX_CREATURES = 5;
const MAX_PARTICLES = 200;
const SPAWN_SUSTAIN_MS = 2000;

const NORMAL_BG_TOP = 0x1a3a2a;
const NORMAL_BG_BOTTOM = 0x0f2818;
const LOW_ENERGY_BG_TOP = 0x2f4f4f;
const LOW_ENERGY_BG_BOTTOM = 0x1a1a2e;

interface SpawnTracker {
  type: CreatureType;
  startTime: number;
  sustained: boolean;
}

export class GardenScene extends Phaser.Scene {
  private audioAnalyzer!: AudioAnalyzer;
  private plant!: Plant;
  private creatures: Creature[] = [];
  private hud!: HUD;
  private audioFeatures: AudioFeatures | null = null;
  private isLowEnergy: boolean = false;
  private lastDecayTime: number = 0;
  private isCelebrating: boolean = false;
  private celebrationStart: number = 0;
  private celebrationRing!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private currentBgTop: number = NORMAL_BG_TOP;
  private currentBgBottom: number = NORMAL_BG_BOTTOM;
  private targetBgTop: number = NORMAL_BG_TOP;
  private targetBgBottom: number = NORMAL_BG_BOTTOM;
  private potContainer!: Phaser.GameObjects.Container;
  private spawnTrackers: Map<string, SpawnTracker> = new Map();
  private potCenterX: number = 0;
  private potCenterY: number = 0;
  private potRadius: number = 200;
  private slotGraphics: Phaser.GameObjects.Graphics[] = [];
  private slotBeams: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private audioContext: AudioContext | null = null;

  constructor() {
    super({ key: 'GardenScene' });
  }

  preload(): void {}

  async create(): Promise<void> {
    this.audioAnalyzer = new AudioAnalyzer();
    const ok = await this.audioAnalyzer.init();
    if (!ok) {
      console.warn('Mic not available, using fallback');
    }

    try {
      this.audioContext = new AudioContext();
      (this.game.config as any).audioContext = this.audioContext;
    } catch (_) {}

    this.computeLayout();
    this.drawBackground();
    this.createPot();
    this.createSlots();

    this.plant = new Plant(this, this.potCenterX, this.potCenterY);
    this.hud = new HUD(this);

    this.lastDecayTime = this.time.now;
  }

  private computeLayout(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    if (w > 1200) {
      this.potCenterX = w / 2;
      this.potCenterY = h / 2 - 30;
      this.potRadius = 200;
    } else {
      this.potCenterX = w / 2;
      this.potCenterY = h / 2 - 60;
      this.potRadius = 150;
    }
  }

  private drawBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.renderBgGradient(this.currentBgTop, this.currentBgBottom);
  }

  private renderBgGradient(top: number, bottom: number): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.bgGraphics.clear();

    const topColor = Phaser.Display.Color.IntegerToColor(top);
    const bottomColor = Phaser.Display.Color.IntegerToColor(bottom);

    for (let y = 0; y < h; y += 4) {
      const t = y / h;
      const r = Phaser.Math.Linear(topColor.red, bottomColor.red, t);
      const g = Phaser.Math.Linear(topColor.green, bottomColor.green, t);
      const b = Phaser.Math.Linear(topColor.blue, bottomColor.blue, t);
      this.bgGraphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      this.bgGraphics.fillRect(0, y, w, 4);
    }
  }

  private createPot(): void {
    this.potContainer = this.add.container(this.potCenterX, this.potCenterY);

    const pot = this.add.graphics();
    pot.lineStyle(3, 0x00ff7f, 0.8);
    pot.fillStyle(0x0a2a1a, 0.5);
    pot.fillCircle(0, 0, this.potRadius);
    pot.strokeCircle(0, 0, this.potRadius);
    pot.setAlpha(0.6);

    this.potContainer.add(pot);
  }

  private createSlots(): void {
    const slotRadius = 30;
    const spacing = 20;
    const totalWidth = 4 * slotRadius * 2 + 3 * spacing;
    const startX = this.potCenterX - totalWidth / 2 + slotRadius;
    const slotY = this.potCenterY + this.potRadius + 40;

    const types = [CreatureType.BUTTERFLY, CreatureType.BEE, CreatureType.BEETLE, CreatureType.FIREFLY];
    const colors = [0xff69b4, 0xffd700, 0x8b4513, 0x00ffff];

    types.forEach((type, i) => {
      const cx = startX + i * (slotRadius * 2 + spacing);
      const g = this.add.graphics();
      g.lineStyle(2, colors[i], 0.6);
      g.fillStyle(0x111111, 0.5);
      g.fillCircle(cx, slotY, slotRadius);
      g.strokeCircle(cx, slotY, slotRadius);
      this.slotGraphics.push(g);

      this.spawnTrackers.set(type, { type, startTime: 0, sustained: false });
    });
  }

  update(time: number, delta: number): void {
    if (this.isCelebrating) {
      this.updateCelebration(time, delta);
      return;
    }

    this.audioFeatures = this.audioAnalyzer.update(time);
    const features = this.audioFeatures;
    if (!features) return;

    this.updateLowEnergyState(features, time, delta);
    this.plant.update(features);
    this.checkCreatureSpawning(features, time);
    this.updateCreatures(delta);
    this.hud.update(
      delta,
      this.plant.getProgress(),
      features.volume,
      this.audioAnalyzer.getTimeDomainData(),
      this.potCenterX,
      this.potCenterY,
      this.potRadius
    );

    if (this.plant.getProgress() >= 100) {
      this.startCelebration(time);
    }

    if (this.isLowEnergy && time - this.lastDecayTime >= DECAY_INTERVAL) {
      this.plant.decayProgress();
      this.lastDecayTime = time;
    }
  }

  private updateLowEnergyState(features: AudioFeatures, time: number, delta: number): void {
    const wasLowEnergy = this.isLowEnergy;
    this.isLowEnergy = features.isLowEnergy;

    if (this.isLowEnergy !== wasLowEnergy) {
      if (this.isLowEnergy) {
        this.targetBgTop = LOW_ENERGY_BG_TOP;
        this.targetBgBottom = LOW_ENERGY_BG_BOTTOM;
        this.plant.setLowEnergy(true);
        this.hud.setLowEnergy(true);
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: LOW_ENERGY_TRANSITION_DURATION,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            const t = tween.getValue();
            this.currentBgTop = this.lerpColor(NORMAL_BG_TOP, LOW_ENERGY_BG_TOP, t);
            this.currentBgBottom = this.lerpColor(NORMAL_BG_BOTTOM, LOW_ENERGY_BG_BOTTOM, t);
            this.renderBgGradient(this.currentBgTop, this.currentBgBottom);
          },
        });

        this.creatures.forEach(c => c.enterStartled());
        this.creatures = [];
      } else {
        this.targetBgTop = NORMAL_BG_TOP;
        this.targetBgBottom = NORMAL_BG_BOTTOM;
        this.plant.setLowEnergy(false);
        this.hud.setLowEnergy(false);
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: LOW_ENERGY_TRANSITION_DURATION,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            const t = tween.getValue();
            this.currentBgTop = this.lerpColor(LOW_ENERGY_BG_TOP, NORMAL_BG_TOP, t);
            this.currentBgBottom = this.lerpColor(LOW_ENERGY_BG_BOTTOM, NORMAL_BG_BOTTOM, t);
            this.renderBgGradient(this.currentBgTop, this.currentBgBottom);
          },
        });
      }
    }
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ca = Phaser.Display.Color.IntegerToColor(a);
    const cb = Phaser.Display.Color.IntegerToColor(b);
    const r = Math.round(Phaser.Math.Linear(ca.red, cb.red, t));
    const g = Math.round(Phaser.Math.Linear(ca.green, cb.green, t));
    const bv = Math.round(Phaser.Math.Linear(ca.blue, cb.blue, t));
    return Phaser.Display.Color.GetColor(r, g, bv);
  }

  private checkCreatureSpawning(features: AudioFeatures, time: number): void {
    if (this.isLowEnergy) return;
    if (this.creatures.filter(c => c.getIsAlive()).length >= MAX_CREATURES) return;

    const bandEnergies: { type: CreatureType; energy: number; threshold: number }[] = [
      { type: CreatureType.BUTTERFLY, energy: features.highFreqEnergy, threshold: 0.3 },
      { type: CreatureType.BEE, energy: features.midFreqEnergy, threshold: 0.3 },
      { type: CreatureType.BEETLE, energy: features.lowFreqEnergy, threshold: 0.3 },
      { type: CreatureType.FIREFLY, energy: features.fullSpectrumEnergy, threshold: 0.6 },
    ];

    bandEnergies.forEach(({ type, energy, threshold }) => {
      const tracker = this.spawnTrackers.get(type);
      if (!tracker) return;

      if (energy >= threshold) {
        if (tracker.startTime === 0) {
          tracker.startTime = time;
          tracker.sustained = false;
        } else if (time - tracker.startTime >= SPAWN_SUSTAIN_MS && !tracker.sustained) {
          tracker.sustained = true;
          this.spawnCreature(type);
        }
      } else {
        tracker.startTime = 0;
        tracker.sustained = false;
      }
    });
  }

  private spawnCreature(type: CreatureType): void {
    const slotIndex = [CreatureType.BUTTERFLY, CreatureType.BEE, CreatureType.BEETLE, CreatureType.FIREFLY].indexOf(type);
    const slotRadius = 30;
    const spacing = 20;
    const totalWidth = 4 * slotRadius * 2 + 3 * spacing;
    const startX = this.potCenterX - totalWidth / 2 + slotRadius;
    const spawnX = startX + slotIndex * (slotRadius * 2 + spacing);
    const spawnY = this.potCenterY + this.potRadius + 40;

    const targetX = this.potCenterX + Phaser.Math.Between(-80, 80);
    const targetY = this.potCenterY + Phaser.Math.Between(-80, -20);

    const creature = new Creature(this, type, spawnX, spawnY, targetX, targetY, 50 + Math.random() * 40);
    this.creatures.push(creature);
    this.hud.recordCreatureSpawn(type);

    this.showSlotBeam(slotIndex, spawnX, spawnY);
  }

  private showSlotBeam(index: number, x: number, y: number): void {
    const key = `beam_${index}`;
    const existing = this.slotBeams.get(key);
    if (existing) existing.destroy();

    const beam = this.add.graphics();
    this.slotBeams.set(key, beam);

    beam.lineStyle(2, 0xffffff, 0.5);
    beam.beginPath();
    beam.moveTo(x, y);
    beam.lineTo(this.potCenterX, this.potCenterY);
    beam.strokePath();

    this.tweens.add({
      targets: beam,
      alpha: { from: 0.5, to: 1.0 },
      duration: 500,
      yoyo: true,
      onComplete: () => {
        beam.destroy();
        this.slotBeams.delete(key);
      },
    });
  }

  private updateCreatures(delta: number): void {
    this.creatures = this.creatures.filter(c => {
      if (c.getIsAlive()) {
        c.update(delta);
        return true;
      }
      return false;
    });
  }

  private startCelebration(time: number): void {
    this.isCelebrating = true;
    this.celebrationStart = time;

    this.celebrationRing = this.add.graphics();
    this.celebrationRing.lineStyle(4, 0xffd700, 1);
    this.celebrationRing.strokeCircle(this.potCenterX, this.potCenterY, this.potRadius + 20);

    this.tweens.add({
      targets: this.celebrationRing,
      angle: 360,
      duration: CELEBRATION_RING_PERIOD,
      repeat: -1,
    });

    const allTypes = [CreatureType.BUTTERFLY, CreatureType.BEE, CreatureType.BEETLE, CreatureType.FIREFLY];
    const radii = [100, 130, 160, 200];
    allTypes.forEach((type, i) => {
      const angle = (i / allTypes.length) * Math.PI * 2;
      const sx = this.potCenterX + Math.cos(angle) * (this.potRadius + 60);
      const sy = this.potCenterY + Math.sin(angle) * (this.potRadius + 60);
      const creature = new Creature(this, type, sx, sy, this.potCenterX, this.potCenterY, radii[i]);
      this.creatures.push(creature);
      this.hud.recordCreatureSpawn(type);
    });
  }

  private updateCelebration(time: number, delta: number): void {
    this.updateCreatures(delta);

    if (time - this.celebrationStart >= CELEBRATION_DURATION) {
      this.endCelebration();
    }
  }

  private endCelebration(): void {
    this.isCelebrating = false;
    if (this.celebrationRing) {
      this.celebrationRing.destroy();
    }
    this.creatures.forEach(c => c.destroy());
    this.creatures = [];
    this.plant.reset();
  }

  destroy(): void {
    this.audioAnalyzer.destroy();
    this.plant.destroy();
    this.creatures.forEach(c => c.destroy());
    this.hud.destroy();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
