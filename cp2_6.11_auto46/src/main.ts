interface CharWave {
  char: string;
  unicode: number;
  frequency: number;
  amplitude: number;
  color: string;
  startX: number;
  endX: number;
  centerX: number;
  pulseProgress: number;
  isPulsing: boolean;
  pulseStartTime: number;
}

const COLORS = ['#FF69B4', '#00CED1', '#FFA500', '#9370DB'];
const MIN_FREQ = 200;
const MAX_FREQ = 800;
const MIN_AMP = 20;
const MAX_AMP = 80;
const CHARS_PER_SECOND_BASE = 20;
const PULSE_DURATION = 300;
const PULSE_RISE_DURATION = 200;
const PULSE_AMPLIFY = 1.5;
const TONE_DURATION = 0.15;
const CANVAS_PADDING_X = 20;
const CANVAS_PADDING_Y = 30;

class LyricWaveApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lyricInput: HTMLInputElement;
  private charCountEl: HTMLElement;
  private skipWarningEl: HTMLElement;
  private btnGenerate: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private btnPlay: HTMLButtonElement;
  private btnStop: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private ampSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private ampValue: HTMLElement;
  private panelHeader: HTMLElement;
  private panelToggle: HTMLElement;
  private panelContent: HTMLElement;
  private infoCard: HTMLElement;
  private cardChar: HTMLElement;
  private cardUnicode: HTMLElement;
  private cardFreq: HTMLElement;
  private canvasWrapper: HTMLElement;

  private waves: CharWave[] = [];
  private isPlaying = false;
  private playStartTime = 0;
  private playheadX = 0;
  private lastTriggeredIndex = -1;
  private hoverX = -1;
  private hoverActive = false;
  private animationFrameId: number | null = null;
  private audioContext: AudioContext | null = null;
  private speedMultiplier = 1.0;
  private ampMultiplier = 1.0;
  private devicePixelRatio = 1;

  constructor() {
    this.canvas = document.getElementById('waveCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    this.ctx = ctx;

    this.lyricInput = document.getElementById('lyricInput') as HTMLInputElement;
    this.charCountEl = document.getElementById('charCount') as HTMLElement;
    this.skipWarningEl = document.getElementById('skipWarning') as HTMLElement;
    this.btnGenerate = document.getElementById('btnGenerate') as HTMLButtonElement;
    this.btnReset = document.getElementById('btnReset') as HTMLButtonElement;
    this.btnPlay = document.getElementById('btnPlay') as HTMLButtonElement;
    this.btnStop = document.getElementById('btnStop') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    this.ampSlider = document.getElementById('ampSlider') as HTMLInputElement;
    this.speedValue = document.getElementById('speedValue') as HTMLElement;
    this.ampValue = document.getElementById('ampValue') as HTMLElement;
    this.panelHeader = document.getElementById('panelHeader') as HTMLElement;
    this.panelToggle = document.getElementById('panelToggle') as HTMLElement;
    this.panelContent = document.getElementById('panelContent') as HTMLElement;
    this.infoCard = document.getElementById('infoCard') as HTMLElement;
    this.cardChar = document.getElementById('cardChar') as HTMLElement;
    this.cardUnicode = document.getElementById('cardUnicode') as HTMLElement;
    this.cardFreq = document.getElementById('cardFreq') as HTMLElement;
    this.canvasWrapper = document.getElementById('canvasWrapper') as HTMLElement;

    this.init();
  }

  private init(): void {
    this.setupCanvas();
    this.bindEvents();
    this.startRenderLoop();
  }

  private setupCanvas(): void {
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
  }

  private bindEvents(): void {
    this.lyricInput.addEventListener('input', () => this.onInputChange());
    this.lyricInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.btnGenerate.disabled) {
        e.preventDefault();
        this.generateWaves();
      }
    });

    this.btnGenerate.addEventListener('click', () => this.generateWaves());
    this.btnReset.addEventListener('click', () => this.reset());
    this.btnPlay.addEventListener('click', () => this.togglePlay());
    this.btnStop.addEventListener('click', () => this.stopPlayback());

    this.speedSlider.addEventListener('input', () => {
      this.speedMultiplier = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = this.speedMultiplier.toFixed(1);
    });

    this.ampSlider.addEventListener('input', () => {
      this.ampMultiplier = parseFloat(this.ampSlider.value);
      this.ampValue.textContent = this.ampMultiplier.toFixed(1);
      if (this.waves.length > 0) {
        this.recalculateWavePositions();
      }
    });

    this.panelHeader.addEventListener('click', () => {
      this.panelToggle.classList.toggle('collapsed');
      this.panelContent.classList.toggle('collapsed');
    });

    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.onCanvasMouseLeave());
  }

  private onInputChange(): void {
    const text = this.lyricInput.value;
    const validChars = Array.from(text).filter(c => this.isValidChar(c));
    const count = validChars.length;

    this.charCountEl.textContent = count.toString();
    this.charCountEl.classList.toggle('over-limit', count > 100);

    const canGenerate = count >= 10 && count <= 100;
    this.btnGenerate.disabled = !canGenerate;
  }

  private isValidChar(c: string): boolean {
    const code = c.codePointAt(0);
    if (code === undefined) return false;
    if (c === ' ' || /[\p{P}\p{S}\p{Z}]/u.test(c)) return false;
    if ((code >= 0x30 && code <= 0x39)) return true;
    if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) return true;
    if (code >= 0x4E00 && code <= 0x9FFF) return true;
    if (code >= 0x3040 && code <= 0x30FF) return true;
    if (code >= 0xAC00 && code <= 0xD7AF) return true;
    return /\w/.test(c);
  }

  private generateWaves(): void {
    const text = this.lyricInput.value;
    const chars = Array.from(text);
    const validChars: string[] = [];
    const skipped: string[] = [];

    for (const c of chars) {
      if (this.isValidChar(c)) {
        validChars.push(c);
      } else if (c !== ' ' && !/[\p{P}\p{S}\p{Z}]/u.test(c)) {
        skipped.push(c);
      }
    }

    if (validChars.length < 10 || validChars.length > 100) {
      return;
    }

    this.skipWarningEl.textContent = skipped.length > 0
      ? `已跳过 ${skipped.length} 个不支持的字符：${skipped.slice(0, 10).join(' ')}${skipped.length > 10 ? '...' : ''}`
      : '';

    this.waves = [];
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const usableWidth = width - CANVAS_PADDING_X * 2;
    const gap = 1;
    const totalGaps = gap * (validChars.length - 1);
    const segmentWidth = (usableWidth - totalGaps) / validChars.length;

    for (let i = 0; i < validChars.length; i++) {
      const c = validChars[i];
      const code = c.codePointAt(0) || 0;
      const hash = this.hashCode(code);

      const freq = MIN_FREQ + (hash % 1000) / 1000 * (MAX_FREQ - MIN_FREQ);
      const amp = MIN_AMP + ((hash >> 10) % 1000) / 1000 * (MAX_AMP - MIN_AMP);
      const color = COLORS[i % COLORS.length];

      const startX = CANVAS_PADDING_X + i * (segmentWidth + gap);
      const endX = startX + segmentWidth;
      const centerX = (startX + endX) / 2;

      this.waves.push({
        char: c,
        unicode: code,
        frequency: freq,
        amplitude: amp,
        color,
        startX,
        endX,
        centerX,
        pulseProgress: 0,
        isPulsing: false,
        pulseStartTime: 0,
      });
    }

    this.btnPlay.disabled = false;
    this.btnStop.disabled = true;
    this.isPlaying = false;
    this.lastTriggeredIndex = -1;
  }

  private recalculateWavePositions(): void {
    if (this.waves.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const usableWidth = width - CANVAS_PADDING_X * 2;
    const gap = 1;
    const totalGaps = gap * (this.waves.length - 1);
    const segmentWidth = (usableWidth - totalGaps) / this.waves.length;

    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      wave.startX = CANVAS_PADDING_X + i * (segmentWidth + gap);
      wave.endX = wave.startX + segmentWidth;
      wave.centerX = (wave.startX + wave.endX) / 2;
    }
  }

  private hashCode(n: number): number {
    let h = n;
    h = (h ^ 61) ^ (h >>> 16);
    h = h + (h << 3);
    h = h ^ (h >>> 4);
    h = h * 0x27d4eb2d;
    h = h ^ (h >>> 15);
    return Math.abs(h);
  }

  private reset(): void {
    this.stopPlayback();
    this.lyricInput.value = '';
    this.waves = [];
    this.charCountEl.textContent = '0';
    this.charCountEl.classList.remove('over-limit');
    this.btnGenerate.disabled = true;
    this.btnPlay.disabled = true;
    this.btnStop.disabled = true;
    this.skipWarningEl.textContent = '';
    this.lastTriggeredIndex = -1;
    this.hoverActive = false;
    this.infoCard.classList.remove('visible');
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback();
    }
  }

  private startPlayback(): void {
    if (this.waves.length === 0) return;
    this.isPlaying = true;
    this.playStartTime = performance.now();
    this.btnPlay.textContent = '⏸ 暂停';
    this.btnStop.disabled = false;
    this.lastTriggeredIndex = -1;
    this.ensureAudioContext();
  }

  private pausePlayback(): void {
    this.isPlaying = false;
    this.btnPlay.textContent = '▶ 播放';
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.playStartTime = 0;
    this.playheadX = 0;
    this.btnPlay.textContent = '▶ 播放';
    this.btnStop.disabled = true;
    this.lastTriggeredIndex = -1;

    for (const wave of this.waves) {
      wave.isPulsing = false;
      wave.pulseProgress = 0;
    }
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AC();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTone(frequency: number): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + TONE_DURATION);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + TONE_DURATION);
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.hoverX = e.clientX - rect.left;
    this.hoverActive = true;

    const wave = this.findWaveAtX(this.hoverX);
    if (wave) {
      this.cardChar.textContent = wave.char;
      this.cardUnicode.textContent = 'U+' + wave.unicode.toString(16).toUpperCase().padStart(4, '0');
      this.cardFreq.textContent = Math.round(wave.frequency) + ' Hz';

      const cardWidth = 160;
      let cardX = this.hoverX;
      cardX = Math.max(cardWidth / 2 + 5, Math.min(cardX, rect.width - cardWidth / 2 - 5));

      const wrapperRect = this.canvasWrapper.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      const offsetLeft = canvasRect.left - wrapperRect.left;
      const offsetTop = canvasRect.top - wrapperRect.top;

      this.infoCard.style.left = (offsetLeft + cardX) + 'px';
      this.infoCard.style.top = (offsetTop + 10) + 'px';
      this.infoCard.classList.add('visible');
    } else {
      this.infoCard.classList.remove('visible');
    }
  }

  private onCanvasMouseLeave(): void {
    this.hoverActive = false;
    this.hoverX = -1;
    this.infoCard.classList.remove('visible');
  }

  private findWaveAtX(x: number): CharWave | null {
    for (const wave of this.waves) {
      if (x >= wave.startX && x <= wave.endX) {
        return wave;
      }
    }
    return null;
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    this.drawGridBackground(ctx, w, h);

    if (this.waves.length === 0) {
      this.drawEmptyHint(ctx, w, h);
      return;
    }

    if (this.isPlaying) {
      this.updatePlayback(performance.now());
    }

    this.updatePulses(performance.now());

    this.drawWaves(ctx, h);
    this.drawSegmentSeparators(ctx, h);
    this.drawHoverReference(ctx, h);
    this.drawPlayhead(ctx, h);
  }

  private drawGridBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(65, 105, 225, 0.06)';
    ctx.lineWidth = 1;

    const gridSize = 30;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(65, 105, 225, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 + 0.5);
    ctx.lineTo(w, h / 2 + 0.5);
    ctx.stroke();
  }

  private drawEmptyHint(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(120, 120, 160, 0.4)';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('输入歌词后点击"生成波形"按钮开始可视化', w / 2, h / 2);
  }

  private updatePlayback(now: number): void {
    if (this.waves.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const usableWidth = w - CANVAS_PADDING_X * 2;
    const charsPerSec = CHARS_PER_SECOND_BASE * this.speedMultiplier;
    const totalDuration = (this.waves.length / charsPerSec) * 1000;

    const elapsed = now - this.playStartTime;
    const progress = Math.min(elapsed / totalDuration, 1);

    this.playheadX = CANVAS_PADDING_X + usableWidth * progress;

    let currentIndex = -1;
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      if (this.playheadX >= wave.centerX) {
        currentIndex = i;
      }
    }

    if (currentIndex !== this.lastTriggeredIndex && currentIndex >= 0) {
      this.lastTriggeredIndex = currentIndex;
      const wave = this.waves[currentIndex];
      wave.isPulsing = true;
      wave.pulseStartTime = now;
      wave.pulseProgress = 0;
      this.playTone(wave.frequency);
    }

    if (progress >= 1) {
      this.stopPlayback();
    }
  }

  private updatePulses(now: number): void {
    for (const wave of this.waves) {
      if (wave.isPulsing) {
        const elapsed = now - wave.pulseStartTime;
        if (elapsed >= PULSE_DURATION) {
          wave.isPulsing = false;
          wave.pulseProgress = 0;
        } else {
          wave.pulseProgress = elapsed / PULSE_DURATION;
        }
      }
    }
  }

  private getPulseMultiplier(wave: CharWave): number {
    if (!wave.isPulsing) return 1;

    const t = wave.pulseProgress;
    if (t < PULSE_RISE_DURATION / PULSE_DURATION) {
      const k = t / (PULSE_RISE_DURATION / PULSE_DURATION);
      return 1 + (PULSE_AMPLIFY - 1) * this.easeOutCubic(k);
    } else {
      const k = (t - PULSE_RISE_DURATION / PULSE_DURATION) / (1 - PULSE_RISE_DURATION / PULSE_DURATION);
      return PULSE_AMPLIFY - (PULSE_AMPLIFY - 1) * this.easeInCubic(k);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  private drawWaves(ctx: CanvasRenderingContext2D, h: number): void {
    const midY = h / 2;
    const hoveredWave = this.hoverActive ? this.findWaveAtX(this.hoverX) : null;

    for (const wave of this.waves) {
      const pulseMult = this.getPulseMultiplier(wave);
      const amp = wave.amplitude * this.ampMultiplier * pulseMult;
      const segWidth = wave.endX - wave.startX;
      const samples = Math.max(10, Math.floor(segWidth * 0.8));

      const isHovered = hoveredWave === wave;

      if (wave.isPulsing) {
        ctx.beginPath();
        ctx.arc(wave.centerX, midY, 15, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(wave.color, 0.3 * (1 - wave.pulseProgress));
        ctx.fill();
      }

      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = wave.startX + t * segWidth;
        const cycles = 2 + (wave.frequency - MIN_FREQ) / (MAX_FREQ - MIN_FREQ) * 3;
        const y = midY - Math.sin(t * Math.PI * 2 * cycles) * amp;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (isHovered) {
        const gradient = ctx.createLinearGradient(wave.startX, 0, wave.endX, 0);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.5, wave.color);
        gradient.addColorStop(1, '#FFFFFF');
        ctx.strokeStyle = gradient;
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = 12;
      } else {
        ctx.strokeStyle = wave.color;
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(224, 224, 255, 0.5)';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      if (segWidth > 14) {
        ctx.fillText(wave.char, wave.centerX, midY + amp * pulseMult + 6);
      }
    }
  }

  private drawSegmentSeparators(ctx: CanvasRenderingContext2D, h: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let i = 1; i < this.waves.length; i++) {
      const wave = this.waves[i];
      const x = wave.startX - 0.5;
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_PADDING_Y);
      ctx.lineTo(x, h - CANVAS_PADDING_Y);
      ctx.stroke();
    }
  }

  private drawHoverReference(ctx: CanvasRenderingContext2D, h: number): void {
    if (!this.hoverActive || this.hoverX < 0) return;

    const x = Math.round(this.hoverX) + 0.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.restore();
  }

  private drawPlayhead(ctx: CanvasRenderingContext2D, h: number): void {
    if (this.waves.length === 0 || this.playheadX <= 0) return;

    const x = this.playheadX;
    const y = h / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 17);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    const goldGradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 5);
    goldGradient.addColorStop(0, '#FFFF99');
    goldGradient.addColorStop(0.5, '#FFD700');
    goldGradient.addColorStop(1, '#FFA500');
    ctx.fillStyle = goldGradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LyricWaveApp();
});
