import {
  ParticleSystem,
  drawBackground,
  drawPlant,
  drawBase,
  drawGrowthPercent,
  drawWaterSparkle,
} from '../art/Visuals';
import type { PlantState, SoundType, PlantStage } from '../art/Visuals';

export type { PlantState, SoundType, PlantStage };

export interface GameState {
  plant: PlantState;
  activeSound: SoundType;
  isMeditating: boolean;
  meditationElapsed: number;
  canWater: boolean;
  waterCooldownMs: number;
}

export type StateCallback = (state: GameState) => void;

const STAGE_THRESHOLDS: { stage: PlantStage; minGrowth: number }[] = [
  { stage: 'seed', minGrowth: 0 },
  { stage: 'sprout', minGrowth: 20 },
  { stage: 'stem', minGrowth: 40 },
  { stage: 'bud', minGrowth: 65 },
  { stage: 'bloom', minGrowth: 90 },
];

const MOOD_COLORS: Record<PlantStage, string> = {
  seed: '#9ca3af',
  sprout: '#86efac',
  stem: '#4ade80',
  bud: '#a78bfa',
  bloom: '#f472b6',
};

export { MOOD_COLORS };

function getStage(growth: number): PlantStage {
  let result: PlantStage = 'seed';
  for (const t of STAGE_THRESHOLDS) {
    if (growth >= t.minGrowth) result = t.stage;
  }
  return result;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private stateCallback: StateCallback;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  private plant: PlantState;
  private activeSound: SoundType = 'none';
  private isMeditating: boolean = false;
  private meditationElapsed: number = 0;
  private breathPhase: number = 0;

  private waterCooldownRemaining: number = 0;
  private lastWaterTime: number = 0;
  private growthAccumulator: number = 0;

  private audioCtx: AudioContext | null = null;
  private currentSoundSource: AudioBufferSourceNode | null = null;
  private currentGainNode: GainNode | null = null;
  private soundBuffers: Map<SoundType, AudioBuffer> = new Map();

  private stageTransitionEffect: { stage: PlantStage; timer: number } | null = null;

  constructor(canvas: HTMLCanvasElement, callback: StateCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particles = new ParticleSystem();
    this.stateCallback = callback;

    this.plant = {
      stage: 'seed',
      growthPercent: 0,
      waterLevel: 50,
      lightLevel: 50,
      stemHeight: 0,
      leafCount: 0,
      bloomProgress: 0,
      saturation: 0.8,
      mood: 0,
      isWatering: false,
      waterTimer: 0,
    };

    this.initAudio();
  }

  private async initAudio() {
    try {
      this.audioCtx = new AudioContext();
      await this.audioCtx.resume();
      this.soundBuffers.set('rain', this.createNoiseBuffer('rain'));
      this.soundBuffers.set('stream', this.createNoiseBuffer('stream'));
      this.soundBuffers.set('wind', this.createNoiseBuffer('wind'));
    } catch {
      this.audioCtx = null;
    }
  }

  private createNoiseBuffer(type: 'rain' | 'stream' | 'wind'): AudioBuffer {
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate;
    const duration = 2;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (type === 'rain') {
        sample = (Math.random() * 2 - 1) * 0.3;
        sample += Math.sin(t * 800) * 0.05;
      } else if (type === 'stream') {
        sample = (Math.random() * 2 - 1) * 0.15;
        sample += Math.sin(t * 200 + Math.sin(t * 50) * 3) * 0.1;
      } else {
        sample = (Math.random() * 2 - 1) * 0.1;
        sample += Math.sin(t * 100 + Math.sin(t * 20) * 5) * 0.08;
      }
      data[i] = sample;
    }

    return buffer;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (timestamp: number) => {
    if (!this.running) return;

    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const p = this.plant;
    const lightFactor = p.lightLevel / 100;
    const waterFactor = p.waterLevel / 100;

    if (p.isWatering) {
      p.waterTimer -= dt;
      if (p.waterTimer <= 0) {
        p.isWatering = false;
        p.waterTimer = 0;
      }
    }

    if (this.waterCooldownRemaining > 0) {
      this.waterCooldownRemaining -= dt;
      if (this.waterCooldownRemaining < 0) this.waterCooldownRemaining = 0;
    }

    this.growthAccumulator += dt;
    if (this.growthAccumulator >= 100) {
      this.growthAccumulator = 0;
      if (p.growthPercent < 100) {
        const growthRate = 0.1 * (0.3 + lightFactor * 0.4 + waterFactor * 0.3);
        p.growthPercent = Math.min(100, p.growthPercent + growthRate);
      }
    }

    const newStage = getStage(p.growthPercent);
    if (newStage !== p.stage) {
      const oldStage = p.stage;
      p.stage = newStage;
      this.onStageChange(oldStage, newStage);
    }

    const targetStem = p.stage === 'seed' ? 0 : p.stage === 'sprout' ? 30 : p.stage === 'stem' ? 80 : p.stage === 'bud' ? 120 : 150;
    p.stemHeight += (targetStem - p.stemHeight) * 0.02;

    const targetLeaf = p.stage === 'seed' ? 0 : p.stage === 'sprout' ? 1 : p.stage === 'stem' ? 3 : 4;
    if (p.leafCount < targetLeaf) {
      p.leafCount = Math.min(targetLeaf, p.leafCount + 0.01);
    }

    if (p.stage === 'bloom') {
      p.bloomProgress = Math.min(1, p.bloomProgress + 0.005);
    }

    const targetSat = p.isWatering ? 1.0 : 0.8;
    p.saturation += (targetSat - p.saturation) * 0.02;

    const stageIdx = STAGE_THRESHOLDS.findIndex(s => s.stage === p.stage);
    p.mood = stageIdx / (STAGE_THRESHOLDS.length - 1);

    if (p.waterLevel > 0) {
      p.waterLevel = Math.max(0, p.waterLevel - 0.005 * (dt / 16.67));
    }

    if (this.stageTransitionEffect) {
      this.stageTransitionEffect.timer -= dt;
      if (this.stageTransitionEffect.timer <= 0) {
        this.stageTransitionEffect = null;
      }
    }

    this.particles.update(dt);

    if (this.activeSound !== 'none') {
      this.particles.emitSoundParticles(this.activeSound, this.canvas.width, this.canvas.height);
    }

    if (p.stage === 'bloom' && Math.random() < 0.03) {
      const cx = this.canvas.width / 2;
      const gy = this.canvas.height - 100;
      this.particles.emitPetals(cx + (Math.random() - 0.5) * 40, gy - p.stemHeight - 10, 1);
    }

    if (this.isMeditating) {
      this.meditationElapsed += dt;
      this.breathPhase += (Math.PI * 2 / 4000) * dt;
      if (this.meditationElapsed >= 60000) {
        this.exitMeditation();
      }
    }

    this.emitState();
  }

  private onStageChange(_oldStage: PlantStage, newStage: PlantStage) {
    const cx = this.canvas.width / 2;
    const gy = this.canvas.height - 100;

    if (newStage === 'sprout') {
      this.particles.emitBurst(cx, gy - 10, 30);
      this.stageTransitionEffect = { stage: 'sprout', timer: 1000 };
    } else if (newStage === 'bloom') {
      this.particles.emitPetals(cx, gy - this.plant.stemHeight - 10, 20);
      this.stageTransitionEffect = { stage: 'bloom', timer: 2000 };
    } else {
      this.stageTransitionEffect = { stage: newStage, timer: 500 };
    }
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.isMeditating) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    } else {
      drawBackground(ctx, w, h);
    }

    const cx = w / 2;
    const groundY = h - 100;

    drawBase(ctx, cx, groundY);

    drawPlant(ctx, this.plant, cx, groundY, this.isMeditating, this.breathPhase);

    drawWaterSparkle(ctx, this.plant, cx, groundY);

    if (this.plant.stage !== 'seed') {
      drawGrowthPercent(ctx, cx, groundY - this.plant.stemHeight - 25, this.plant.growthPercent);
    } else {
      drawGrowthPercent(ctx, cx, groundY - 25, this.plant.growthPercent);
    }

    this.particles.draw(ctx);
  }

  private emitState() {
    this.stateCallback({
      plant: { ...this.plant },
      activeSound: this.activeSound,
      isMeditating: this.isMeditating,
      meditationElapsed: this.meditationElapsed,
      canWater: this.waterCooldownRemaining <= 0,
      waterCooldownMs: this.waterCooldownRemaining,
    });
  }

  water() {
    if (this.waterCooldownRemaining > 0) return;
    const now = performance.now();
    if (now - this.lastWaterTime < 5000) return;

    this.lastWaterTime = now;
    this.waterCooldownRemaining = 5000;

    const p = this.plant;
    p.waterLevel = Math.min(100, p.waterLevel + 20);
    p.isWatering = true;
    p.waterTimer = 2000;

    const cx = this.canvas.width / 2;
    const gy = this.canvas.height - 100;
    this.particles.emitSparkle(cx, gy - p.stemHeight * 0.5, 12);

    setTimeout(() => {
      this.particles.emitDrip(cx, gy - p.stemHeight + 10);
    }, 500);

    if (p.growthPercent < 100) {
      p.growthPercent = Math.min(100, p.growthPercent + 2);
    }
  }

  setLight(value: number) {
    this.plant.lightLevel = Math.max(0, Math.min(100, value));
  }

  toggleSound(): SoundType {
    const sounds: SoundType[] = ['none', 'rain', 'stream', 'wind'];
    const idx = sounds.indexOf(this.activeSound);
    const next = sounds[(idx + 1) % sounds.length];
    this.playSound(next);
    return this.activeSound;
  }

  setSound(sound: SoundType) {
    this.playSound(sound);
  }

  private playSound(sound: SoundType) {
    this.stopSound();

    if (sound === 'none' || !this.audioCtx) {
      this.activeSound = 'none';
      this.emitState();
      return;
    }

    const buffer = this.soundBuffers.get(sound);
    if (!buffer) {
      this.activeSound = 'none';
      this.emitState();
      return;
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.5);

    let filter: BiquadFilterNode;
    if (sound === 'rain') {
      filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.5;
    } else if (sound === 'stream') {
      filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      filter.Q.value = 0.7;
    } else {
      filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      filter.Q.value = 0.3;
    }

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    source.start();

    this.currentSoundSource = source;
    this.currentGainNode = gainNode;
    this.activeSound = sound;
    this.emitState();
  }

  private stopSound() {
    if (this.currentGainNode && this.audioCtx) {
      try {
        this.currentGainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.5);
        const src = this.currentSoundSource;
        setTimeout(() => {
          try { src?.stop(); } catch { /* already stopped */ }
        }, 600);
      } catch { /* ignore */ }
    }
    this.currentSoundSource = null;
    this.currentGainNode = null;
  }

  enterMeditation() {
    if (this.isMeditating) return;
    this.isMeditating = true;
    this.meditationElapsed = 0;
    this.breathPhase = 0;
    this.emitState();
  }

  private exitMeditation() {
    this.isMeditating = false;
    this.meditationElapsed = 0;
    this.breathPhase = 0;
    this.playHarpSound();
    this.emitState();
  }

  exitMeditationManual() {
    this.exitMeditation();
  }

  private playHarpSound() {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.audioCtx!.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, this.audioCtx!.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx!.currentTime + i * 0.15 + 1.5);
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(this.audioCtx!.currentTime + i * 0.15);
      osc.stop(this.audioCtx!.currentTime + i * 0.15 + 1.5);
    });
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getActiveSound(): SoundType {
    return this.activeSound;
  }

  getIsMeditating(): boolean {
    return this.isMeditating;
  }

  getMoodColor(): string {
    return MOOD_COLORS[this.plant.stage];
  }

  destroy() {
    this.stop();
    this.stopSound();
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
