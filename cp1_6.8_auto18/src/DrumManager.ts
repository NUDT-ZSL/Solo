import type { BeatEvent } from './BeatAnalyzer';

export type PillarState = 'idle' | 'preview' | 'active' | 'hit' | 'missed';

export interface PillarData {
  index: number;
  state: PillarState;
  glowIntensity: number;
  hitAnimProgress: number;
  bounceY: number;
  glowBurstProgress: number;
  pendingBeat: BeatEvent | null;
}

export interface DrumManagerState {
  pillars: PillarData[];
  particles: ParticleData[];
}

export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

type DrumSoundType = 'hit' | 'miss' | 'preview';

const FREQUENCIES = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66];

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playDrumSound(pillarIndex: number, type: DrumSoundType, volume: number): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  if (type === 'hit') {
    const osc = ctx.createOscillator();
    const freq = FREQUENCIES[pillarIndex % FREQUENCIES.length];
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 2, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.1);
    gain.gain.setValueAtTime(volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.3);

    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'square';
    noise.frequency.setValueAtTime(freq * 4, now);
    noiseGain.gain.setValueAtTime(volume * 0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.08);
  } else if (type === 'miss') {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gain.gain.setValueAtTime(volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.2);
  } else {
    const osc = ctx.createOscillator();
    const freq = FREQUENCIES[pillarIndex % FREQUENCIES.length];
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

function playMetronome(volume: number, bpm: number): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  const now = ctx.currentTime;
  const beatInterval = 60 / bpm;

  for (let i = 0; i < 4; i++) {
    const time = now + i * beatInterval;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(i === 0 ? 880 : 660, time);
    gain.gain.setValueAtTime(volume * 0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }
}

const PARTICLE_COLORS = [
  '#FF6B35', '#FF8C42', '#FFB347', '#FFD700',
  '#FFA500', '#FF4500', '#FF6347', '#FFD700',
];

function randomParticleColor(): string {
  return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
}

export class DrumManager {
  private pillars: PillarData[];
  private particles: ParticleData[];
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.5;
  private pendingBeats: Map<number, BeatEvent> = new Map();
  private lastMetronomeBeat: number = -1;

  constructor(pillarCount: number) {
    this.pillars = [];
    this.particles = [];
    for (let i = 0; i < pillarCount; i++) {
      this.pillars.push({
        index: i,
        state: 'idle',
        glowIntensity: 0,
        hitAnimProgress: 0,
        bounceY: 0,
        glowBurstProgress: 0,
        pendingBeat: null,
      });
    }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
  }

  triggerPreview(pillarIndex: number, beat: BeatEvent): void {
    if (pillarIndex >= this.pillars.length) return;
    const pillar = this.pillars[pillarIndex];
    pillar.state = 'preview';
    pillar.glowIntensity = 0.4;
    pillar.pendingBeat = beat;
    this.pendingBeats.set(pillarIndex, beat);
    playDrumSound(pillarIndex, 'preview', this.sfxVolume);
  }

  activatePillar(pillarIndex: number): void {
    if (pillarIndex >= this.pillars.length) return;
    const pillar = this.pillars[pillarIndex];
    if (pillar.state === 'preview') {
      pillar.state = 'active';
      pillar.glowIntensity = 1.0;
    }
  }

  handleHit(pillarIndex: number, quality: 'perfect' | 'good'): PillarData {
    const pillar = this.pillars[pillarIndex];
    pillar.state = 'hit';
    pillar.hitAnimProgress = 1.0;
    pillar.bounceY = -12;
    pillar.glowBurstProgress = 1.0;
    pillar.glowIntensity = quality === 'perfect' ? 1.5 : 1.0;
    this.pendingBeats.delete(pillarIndex);

    playDrumSound(pillarIndex, 'hit', this.sfxVolume);
    this.spawnHitParticles(pillarIndex, quality === 'perfect' ? 20 : 10);

    return { ...pillar };
  }

  handleMiss(pillarIndex: number): PillarData {
    const pillar = this.pillars[pillarIndex];
    pillar.state = 'missed';
    pillar.glowIntensity = 0.2;
    this.pendingBeats.delete(pillarIndex);

    playDrumSound(pillarIndex, 'miss', this.sfxVolume);

    return { ...pillar };
  }

  handleWrongHit(pillarIndex: number): void {
    if (pillarIndex >= this.pillars.length) return;
    const pillar = this.pillars[pillarIndex];
    if (pillar.state === 'idle') {
      pillar.bounceY = -5;
      pillar.hitAnimProgress = 0.5;
      playDrumSound(pillarIndex, 'miss', this.sfxVolume * 0.3);
    }
  }

  tryHit(pillarIndex: number, currentTime: number, hitWindow: number, latencyOffset: number): 'perfect' | 'good' | 'miss' | null {
    if (pillarIndex >= this.pillars.length) return null;
    const pillar = this.pillars[pillarIndex];

    if (pillar.state !== 'active' && pillar.state !== 'preview') {
      this.handleWrongHit(pillarIndex);
      return null;
    }

    const beat = pillar.pendingBeat;
    if (!beat) {
      this.handleWrongHit(pillarIndex);
      return null;
    }

    const diff = Math.abs((currentTime + latencyOffset) - beat.time);
    if (diff <= hitWindow * 0.4) {
      this.handleHit(pillarIndex, 'perfect');
      return 'perfect';
    }
    if (diff <= hitWindow) {
      this.handleHit(pillarIndex, 'good');
      return 'good';
    }
    this.handleMiss(pillarIndex);
    return 'miss';
  }

  spawnComboParticles(comboCount: number): void {
    const count = Math.min(comboCount * 5, 100);
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number, vx: number, vy: number;

      switch (side) {
        case 0:
          x = Math.random() * w; y = 0;
          vx = (Math.random() - 0.5) * 4; vy = Math.random() * 3 + 1;
          break;
        case 1:
          x = w; y = Math.random() * h;
          vx = -(Math.random() * 3 + 1); vy = (Math.random() - 0.5) * 4;
          break;
        case 2:
          x = Math.random() * w; y = h;
          vx = (Math.random() - 0.5) * 4; vy = -(Math.random() * 3 + 1);
          break;
        default:
          x = 0; y = Math.random() * h;
          vx = Math.random() * 3 + 1; vy = (Math.random() - 0.5) * 4;
          break;
      }

      this.particles.push({
        x, y, vx, vy,
        life: 1.0,
        maxLife: 1.0,
        color: randomParticleColor(),
        size: Math.random() * 6 + 2,
      });
    }
  }

  private spawnHitParticles(pillarIndex: number, count: number): void {
    const cols = Math.ceil(Math.sqrt(this.pillars.length));
    const row = Math.floor(pillarIndex / cols);
    const col = pillarIndex % cols;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cellW = w / (cols + 1);
    const cellH = (h * 0.6) / (Math.ceil(this.pillars.length / cols) + 1);
    const cx = cellW * (col + 1);
    const cy = h * 0.25 + cellH * (row + 1);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color: randomParticleColor(),
        size: Math.random() * 5 + 2,
      });
    }
  }

  tickMetronome(currentTime: number, bpm: number, startTime: number): void {
    const beatInterval = 60000 / bpm;
    const elapsed = currentTime - startTime;
    const currentBeat = Math.floor(elapsed / beatInterval);
    if (currentBeat !== this.lastMetronomeBeat && currentBeat >= 0) {
      this.lastMetronomeBeat = currentBeat;
      if (currentBeat % 4 === 0) {
        playMetronome(this.musicVolume, bpm);
      }
    }
  }

  update(dt: number): DrumManagerState {
    const dtSec = dt / 1000;

    for (const pillar of this.pillars) {
      if (pillar.state === 'hit') {
        pillar.hitAnimProgress = Math.max(0, pillar.hitAnimProgress - dtSec * 4);
        pillar.bounceY += (-pillar.bounceY) * dtSec * 12;
        pillar.glowBurstProgress = Math.max(0, pillar.glowBurstProgress - dtSec * 3);
        pillar.glowIntensity = Math.max(0, pillar.glowIntensity - dtSec * 2);

        if (pillar.hitAnimProgress <= 0.01 && pillar.glowBurstProgress <= 0.01) {
          pillar.state = 'idle';
          pillar.glowIntensity = 0;
          pillar.bounceY = 0;
          pillar.hitAnimProgress = 0;
          pillar.glowBurstProgress = 0;
        }
      }

      if (pillar.state === 'missed') {
        pillar.glowIntensity = Math.max(0, pillar.glowIntensity - dtSec * 3);
        if (pillar.glowIntensity <= 0.01) {
          pillar.state = 'idle';
          pillar.glowIntensity = 0;
        }
      }

      if (pillar.state === 'preview') {
        pillar.glowIntensity = Math.min(pillar.glowIntensity + dtSec * 2, 0.6);
      }

      if (pillar.state === 'active') {
        pillar.glowIntensity = Math.max(pillar.glowIntensity - dtSec * 1.5, 0.6);
      }

      if (pillar.bounceY !== 0 && pillar.state === 'idle') {
        pillar.bounceY += (-pillar.bounceY) * dtSec * 10;
        if (Math.abs(pillar.bounceY) < 0.1) pillar.bounceY = 0;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= dtSec * 1.5;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    return {
      pillars: this.pillars.map((p) => ({ ...p })),
      particles: this.particles.map((p) => ({ ...p })),
    };
  }

  resetPillar(pillarIndex: number): void {
    if (pillarIndex >= this.pillars.length) return;
    const pillar = this.pillars[pillarIndex];
    pillar.state = 'idle';
    pillar.glowIntensity = 0;
    pillar.hitAnimProgress = 0;
    pillar.bounceY = 0;
    pillar.glowBurstProgress = 0;
    pillar.pendingBeat = null;
    this.pendingBeats.delete(pillarIndex);
  }

  reset(): void {
    for (let i = 0; i < this.pillars.length; i++) {
      this.resetPillar(i);
    }
    this.particles.length = 0;
    this.pendingBeats.clear();
    this.lastMetronomeBeat = -1;
  }

  resize(newCount: number): void {
    this.pillars = [];
    for (let i = 0; i < newCount; i++) {
      this.pillars.push({
        index: i,
        state: 'idle',
        glowIntensity: 0,
        hitAnimProgress: 0,
        bounceY: 0,
        glowBurstProgress: 0,
        pendingBeat: null,
      });
    }
    this.particles.length = 0;
    this.pendingBeats.clear();
    this.lastMetronomeBeat = -1;
  }

  getState(): DrumManagerState {
    return {
      pillars: this.pillars.map((p) => ({ ...p })),
      particles: [...this.particles],
    };
  }
}
