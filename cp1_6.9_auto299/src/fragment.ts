export interface Fragment {
  id: number;
  x: number;
  y: number;
  trackIndex: number;
  noteIndex: number;
  color: string;
  frequency: number;
  collected: boolean;
  collectProgress: number;
  pulsePhase: number;
  originalX: number;
  originalY: number;
}

export const NOTE_CONFIG = [
  { noteIndex: 0, color: '#FF4757', frequency: 523.25, name: 'C5' },
  { noteIndex: 1, color: '#FF8C42', frequency: 587.33, name: 'D5' },
  { noteIndex: 2, color: '#FFD93D', frequency: 659.25, name: 'E5' },
  { noteIndex: 3, color: '#6BCB77', frequency: 698.46, name: 'F5' },
  { noteIndex: 4, color: '#4ECDC4', frequency: 783.99, name: 'G5' },
  { noteIndex: 5, color: '#5E60CE', frequency: 880.00, name: 'A5' },
  { noteIndex: 6, color: '#C77DFF', frequency: 987.77, name: 'B5' }
];

export interface CollectEffect {
  color: string;
  life: number;
  maxLife: number;
  screenEdge: boolean;
}

export class FragmentSystem {
  fragments: Fragment[] = [];
  nextId: number = 0;
  canvasWidth: number;
  canvasHeight: number;
  isMobile: boolean;
  collectEffects: CollectEffect[] = [];
  spawnTimer: number = 0;
  spawnInterval: number = 2.0;
  audioContext: AudioContext | null = null;

  constructor(canvasWidth: number, canvasHeight: number, isMobile: boolean) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isMobile = isMobile;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playNote(frequency: number): void {
    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(frequency, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(frequency * 2, now);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.06, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(filter);
      gain2.connect(filter);
      filter.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (_e) {
      // Audio not available
    }
  }

  spawn(trackY: number, trackIndex: number, noteIndex: number, x: number): void {
    const config = NOTE_CONFIG[noteIndex % NOTE_CONFIG.length];
    const fragment: Fragment = {
      id: this.nextId++,
      x,
      y: trackY,
      originalX: x,
      originalY: trackY,
      trackIndex,
      noteIndex: config.noteIndex,
      color: config.color,
      frequency: config.frequency,
      collected: false,
      collectProgress: 0,
      pulsePhase: Math.random() * Math.PI * 2
    };
    this.fragments.push(fragment);
  }

  spawnRandom(trackYs: number[]): void {
    const available: { trackIdx: number; noteIdx: number }[] = [];
    for (let ti = 0; ti < trackYs.length; ti++) {
      for (let ni = 0; ni < NOTE_CONFIG.length; ni++) {
        const exists = this.fragments.some(f => !f.collected && f.trackIndex === ti && f.noteIndex === ni);
        if (!exists) {
          available.push({ trackIdx: ti, noteIdx: ni });
        }
      }
    }
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    const margin = this.isMobile ? 80 : 150;
    const x = margin + Math.random() * (this.canvasWidth - margin * 2);
    this.spawn(trackYs[pick.trackIdx], pick.trackIdx, pick.noteIdx, x);
  }

  update(dt: number, playerX: number, playerY: number, onCollected: (noteIndex: number, color: string) => void): void {
    this.spawnTimer += dt;

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.pulsePhase += dt * 3;

      if (f.collected) {
        f.collectProgress += dt / 0.2;
        if (f.collectProgress >= 1) {
          this.fragments.splice(i, 1);
        } else {
          const t = f.collectProgress;
          const easeT = t * t;
          f.x = f.originalX + (playerX - f.originalX) * easeT;
          f.y = f.originalY + (playerY - f.originalY) * easeT;
        }
      } else {
        const dx = playerX - f.x;
        const dy = playerY - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attachRadius = this.isMobile ? 35 : 60;

        if (dist < attachRadius) {
          f.collected = true;
          f.originalX = f.x;
          f.originalY = f.y;
          this.collectEffects.push({
            color: f.color,
            life: 0.4,
            maxLife: 0.4,
            screenEdge: true
          });
          this.playNote(f.frequency);
          onCollected(f.noteIndex, f.color);
        }
      }
    }

    for (let i = this.collectEffects.length - 1; i >= 0; i--) {
      this.collectEffects[i].life -= dt;
      if (this.collectEffects[i].life <= 0) {
        this.collectEffects.splice(i, 1);
      }
    }
  }

  removeByNoteIndex(noteIndex: number): boolean {
    const idx = this.fragments.findIndex(f => !f.collected && f.noteIndex === noteIndex);
    if (idx >= 0) {
      this.fragments.splice(idx, 1);
      return true;
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const f of this.fragments) {
      const pulse = 1 + Math.sin(f.pulsePhase) * 0.15;
      const baseSize = this.isMobile ? 6 : 10;
      const size = baseSize * pulse;
      let alpha = 1;

      if (f.collected) {
        alpha = 1 - f.collectProgress;
      }

      ctx.save();

      const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, size * 2.5);
      gradient.addColorStop(0, f.color + Math.floor(alpha * 180).toString(16).padStart(2, '0'));
      gradient.addColorStop(0.5, f.color + Math.floor(alpha * 60).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, f.color + '00');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(f.x, f.y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = f.color;
      ctx.shadowBlur = 15 * alpha;
      ctx.fillStyle = f.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(f.x, f.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(f.x - size * 0.3, f.y - size * 0.3, size * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  renderCollectEffects(ctx: CanvasRenderingContext2D): void {
    for (const effect of this.collectEffects) {
      const t = effect.life / effect.maxLife;
      const alpha = t;

      const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
      gradient.addColorStop(0, effect.color + '00');
      gradient.addColorStop(0.1, effect.color + Math.floor(alpha * 120).toString(16).padStart(2, '0'));
      gradient.addColorStop(0.9, effect.color + Math.floor(alpha * 120).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, effect.color + '00');

      const hGradient = ctx.createLinearGradient(0, 0, this.canvasWidth, 0);
      hGradient.addColorStop(0, effect.color + Math.floor(alpha * 80).toString(16).padStart(2, '0'));
      hGradient.addColorStop(0.5, effect.color + '00');
      hGradient.addColorStop(1, effect.color + Math.floor(alpha * 80).toString(16).padStart(2, '0'));

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvasWidth, 40 * t);
      ctx.fillRect(0, this.canvasHeight - 40 * t, this.canvasWidth, 40 * t);

      ctx.fillStyle = hGradient;
      ctx.fillRect(0, 0, 60 * t, this.canvasHeight);
      ctx.fillRect(this.canvasWidth - 60 * t, 0, 60 * t, this.canvasHeight);

      ctx.restore();
    }
  }
}
