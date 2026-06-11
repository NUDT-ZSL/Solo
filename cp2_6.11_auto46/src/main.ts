interface CharWave {
  char: string;
  unicode: number;
  frequency: number;
  baseAmplitude: number;
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
const CANVAS_PADDING_X = 24;
const CANVAS_PADDING_Y = 20;
const SEGMENT_GAP = 1;
const LINE_WIDTH = 2;
const PLAYHEAD_RADIUS = 5;
const PLAYHEAD_GLOW_RADIUS = 14;
const BG_CIRCLE_RADIUS = 15;
const BG_CIRCLE_OPACITY = 0.3;

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
  private isPaused = false;
  private playStartTime = 0;
  private pausedElapsed = 0;
  private playheadX = 0;
  private lastTriggeredIndex = -1;
  private hoverX = -1;
  private hoverActive = false;
  private animationFrameId: number | null = null;
  private audioContext: AudioContext | null = null;
  private playbackSpeed = 1.0;
  private amplitudeScale = 1.0;
  private devicePixelRatio = 1;
  private canvasWidth = 0;
  private canvasHeight = 0;

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
    this.updateCharCount();
    this.startRenderLoop();
  }

  private setupCanvas(): void {
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      if (this.waves.length > 0) {
        this.recalculateWavePositions();
      }
    });
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
  }

  private bindEvents(): void {
    this.lyricInput.addEventListener('input', () => this.updateCharCount());

    this.lyricInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.btnGenerate.disabled) {
        e.preventDefault();
        this.generateWaveform();
      }
    });

    this.btnGenerate.addEventListener('click', () => this.generateWaveform());
    this.btnReset.addEventListener('click', () => this.resetAll());

    this.btnPlay.addEventListener('click', () => this.togglePlay());
    this.btnStop.addEventListener('click', () => this.stopPlayback());

    this.speedSlider.addEventListener('input', () => {
      this.playbackSpeed = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = this.playbackSpeed.toFixed(1);
    });

    this.ampSlider.addEventListener('input', () => {
      this.amplitudeScale = parseFloat(this.ampSlider.value);
      this.ampValue.textContent = this.amplitudeScale.toFixed(1);
    });

    this.panelHeader.addEventListener('click', () => {
      this.panelToggle.classList.toggle('collapsed');
      this.panelContent.classList.toggle('collapsed');
    });

    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleCanvasMouseLeave());
  }

  private updateCharCount(): void {
    const text = this.lyricInput.value;
    const chars = Array.from(text);
    const validChars: string[] = [];
    const skippedChars: string[] = [];

    for (const c of chars) {
      if (this.isSupportedChar(c)) {
        validChars.push(c);
      } else if (c !== ' ' && !/[\s]/.test(c)) {
        skippedChars.push(c);
      }
    }

    const count = validChars.length;
    this.charCountEl.textContent = count.toString();

    if (count > 100) {
      this.charCountEl.classList.add('over-limit');
      this.btnGenerate.disabled = true;
    } else {
      this.charCountEl.classList.remove('over-limit');
      this.btnGenerate.disabled = count < 10;
    }

    if (skippedChars.length > 0) {
      const preview = skippedChars.slice(0, 8).join(' ');
      const more = skippedChars.length > 8 ? '...' : '';
      this.skipWarningEl.textContent = `注意：已识别到 ${skippedChars.length} 个不支持的字符（${preview}${more}）将在生成时被跳过`;
    } else {
      this.skipWarningEl.textContent = '';
    }
  }

  private isSupportedChar(c: string): boolean {
    const code = c.codePointAt(0);
    if (code === undefined) return false;
    if (c.trim() === '') return false;
    if (/[\p{P}\p{S}\p{Z}]/u.test(c)) return false;

    if (code >= 0x30 && code <= 0x39) return true;
    if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) return true;
    if (code >= 0x4E00 && code <= 0x9FFF) return true;
    if (code >= 0x3040 && code <= 0x30FF) return true;
    if (code >= 0xAC00 && code <= 0xD7AF) return true;
    if (/^\w$/.test(c)) return true;

    return false;
  }

  private generateWaveform(): void {
    const text = this.lyricInput.value;
    const chars = Array.from(text);
    const validChars: string[] = [];
    const skipped: string[] = [];

    for (const c of chars) {
      if (this.isSupportedChar(c)) {
        validChars.push(c);
      } else if (c !== ' ' && !/[\s]/.test(c)) {
        skipped.push(c);
      }
    }

    if (validChars.length < 10 || validChars.length > 100) {
      return;
    }

    if (skipped.length > 0) {
      const preview = skipped.slice(0, 8).join('');
      const more = skipped.length > 8 ? '...' : '';
      this.skipWarningEl.textContent = `已跳过 ${skipped.length} 个不支持的字符：${preview}${more}`;
    } else {
      this.skipWarningEl.textContent = '';
    }

    this.stopPlayback();
    this.waves = [];

    const usableWidth = this.canvasWidth - CANVAS_PADDING_X * 2;
    const totalGaps = SEGMENT_GAP * (validChars.length - 1);
    const segmentWidth = (usableWidth - totalGaps) / validChars.length;

    for (let i = 0; i < validChars.length; i++) {
      const c = validChars[i];
      const code = c.codePointAt(0) || 0;
      const hash = this.computeHash(code);

      const freq = MIN_FREQ + (hash % 1000) / 1000 * (MAX_FREQ - MIN_FREQ);
      const amp = MIN_AMP + ((hash >>> 10) % 1000) / 1000 * (MAX_AMP - MIN_AMP);
      const color = COLORS[i % COLORS.length];

      const startX = CANVAS_PADDING_X + i * (segmentWidth + SEGMENT_GAP);
      const endX = startX + segmentWidth;
      const centerX = (startX + endX) / 2;

      this.waves.push({
        char: c,
        unicode: code,
        frequency: freq,
        baseAmplitude: amp,
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
  }

  private recalculateWavePositions(): void {
    if (this.waves.length === 0) return;

    const usableWidth = this.canvasWidth - CANVAS_PADDING_X * 2;
    const totalGaps = SEGMENT_GAP * (this.waves.length - 1);
    const segmentWidth = (usableWidth - totalGaps) / this.waves.length;

    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      wave.startX = CANVAS_PADDING_X + i * (segmentWidth + SEGMENT_GAP);
      wave.endX = wave.startX + segmentWidth;
      wave.centerX = (wave.startX + wave.endX) / 2;
    }
  }

  private computeHash(n: number): number {
    let h = n >>> 0;
    h = (h ^ 61) ^ (h >>> 16);
    h = h + (h << 3);
    h = h ^ (h >>> 4);
    h = Math.imul(h, 0x27d4eb2d);
    h = h ^ (h >>> 15);
    return Math.abs(h >>> 0);
  }

  private resetAll(): void {
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
    this.hoverX = -1;
    this.infoCard.classList.remove('visible');
    this.playheadX = 0;
    this.pausedElapsed = 0;
    this.isPaused = false;
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

    this.ensureAudioContext();

    if (this.isPaused) {
      this.playStartTime = performance.now() - this.pausedElapsed;
      this.isPaused = false;
    } else {
      this.playStartTime = performance.now();
      this.lastTriggeredIndex = -1;
      this.playheadX = CANVAS_PADDING_X;
      this.pausedElapsed = 0;

      for (const wave of this.waves) {
        wave.isPulsing = false;
        wave.pulseProgress = 0;
      }
    }

    this.isPlaying = true;
    this.btnPlay.textContent = '⏸ 暂停';
    this.btnStop.disabled = false;
  }

  private pausePlayback(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.isPaused = true;
    this.pausedElapsed = performance.now() - this.playStartTime;
    this.btnPlay.textContent = '▶ 播放';
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedElapsed = 0;
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
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + TONE_DURATION);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + TONE_DURATION);
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.hoverX = e.clientX - rect.left;
    this.hoverActive = true;

    const wave = this.findWaveAtPosition(this.hoverX);
    if (wave) {
      this.cardChar.textContent = wave.char;
      this.cardUnicode.textContent = 'U+' + wave.unicode.toString(16).toUpperCase().padStart(4, '0');
      this.cardFreq.textContent = Math.round(wave.frequency) + ' Hz';

      const cardWidth = 150;
      let cardX = this.hoverX;
      cardX = Math.max(cardWidth / 2 + 8, Math.min(cardX, this.canvasWidth - cardWidth / 2 - 8));

      const wrapperRect = this.canvasWrapper.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      const offsetLeft = canvasRect.left - wrapperRect.left;
      const offsetTop = canvasRect.top - wrapperRect.top;

      this.infoCard.style.left = (offsetLeft + cardX) + 'px';
      this.infoCard.style.top = (offsetTop + 8) + 'px';
      this.infoCard.classList.add('visible');
    } else {
      this.infoCard.classList.remove('visible');
    }
  }

  private handleCanvasMouseLeave(): void {
    this.hoverActive = false;
    this.hoverX = -1;
    this.infoCard.classList.remove('visible');
  }

  private findWaveAtPosition(x: number): CharWave | null {
    for (const wave of this.waves) {
      if (x >= wave.startX && x <= wave.endX) {
        return wave;
      }
    }
    return null;
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private renderFrame(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h);

    if (this.waves.length === 0) {
      this.drawPlaceholder(ctx, w, h);
      return;
    }

    const now = performance.now();

    if (this.isPlaying) {
      this.updatePlaybackPosition(now);
    }

    this.updatePulseAnimations(now);

    this.drawPulseBackgroundCircles(ctx, h);
    this.drawAllWaves(ctx, h);
    this.drawSegmentDividers(ctx, h);
    this.drawCharLabels(ctx, h);
    this.drawHoverGuide(ctx, h);
    this.drawPlayhead(ctx, h);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(65, 105, 225, 0.05)';
    ctx.lineWidth = 1;

    const gridSize = 28;
    for (let x = gridSize; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(65, 105, 225, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 + 0.5);
    ctx.lineTo(w, h / 2 + 0.5);
    ctx.stroke();
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(120, 120, 170, 0.35)';
    ctx.font = '15px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('输入歌词后点击「生成波形」按钮开始可视化体验', w / 2, h / 2);
  }

  private updatePlaybackPosition(now: number): void {
    if (this.waves.length === 0) return;

    const usableWidth = this.canvasWidth - CANVAS_PADDING_X * 2;
    const charsPerSecond = CHARS_PER_SECOND_BASE * this.playbackSpeed;
    const totalDurationMs = (this.waves.length / charsPerSecond) * 1000;

    const elapsed = now - this.playStartTime;
    const progress = Math.min(elapsed / totalDurationMs, 1);

    this.playheadX = CANVAS_PADDING_X + usableWidth * progress;

    let currentIndex = -1;
    for (let i = 0; i < this.waves.length; i++) {
      if (this.playheadX >= this.waves[i].centerX) {
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

  private updatePulseAnimations(now: number): void {
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

  private getPulseAmplitudeMultiplier(wave: CharWave): number {
    if (!wave.isPulsing) return 1;

    const t = wave.pulseProgress;
    const riseRatio = PULSE_RISE_DURATION / PULSE_DURATION;

    if (t < riseRatio) {
      const k = t / riseRatio;
      return 1 + (PULSE_AMPLIFY - 1) * this.easeOutCubic(k);
    } else {
      const k = (t - riseRatio) / (1 - riseRatio);
      return PULSE_AMPLIFY - (PULSE_AMPLIFY - 1) * this.easeInQuad(k);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private drawPulseBackgroundCircles(ctx: CanvasRenderingContext2D, h: number): void {
    const midY = h / 2;

    for (const wave of this.waves) {
      if (!wave.isPulsing) continue;

      const alpha = BG_CIRCLE_OPACITY * (1 - wave.pulseProgress * 0.5);
      const radius = BG_CIRCLE_RADIUS * (1 + wave.pulseProgress * 0.3);

      ctx.beginPath();
      ctx.arc(wave.centerX, midY, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(wave.color, alpha);
      ctx.fill();
    }
  }

  private drawAllWaves(ctx: CanvasRenderingContext2D, h: number): void {
    const midY = h / 2;
    const hoveredWave = this.hoverActive ? this.findWaveAtPosition(this.hoverX) : null;

    for (const wave of this.waves) {
      const pulseMult = this.getPulseAmplitudeMultiplier(wave);
      const amplitude = wave.baseAmplitude * this.amplitudeScale * pulseMult;
      const segWidth = wave.endX - wave.startX;

      const samplesPerChar = Math.max(30, Math.floor(segWidth * 1.5));
      const isHovered = hoveredWave === wave;

      const cyclesPerSegment = 1.5 + (wave.frequency - MIN_FREQ) / (MAX_FREQ - MIN_FREQ) * 2.5;

      ctx.beginPath();
      for (let i = 0; i <= samplesPerChar; i++) {
        const t = i / samplesPerChar;
        const x = wave.startX + t * segWidth;
        const y = midY - Math.sin(t * Math.PI * 2 * cyclesPerSegment) * amplitude;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (isHovered) {
        const gradient = ctx.createLinearGradient(wave.startX, 0, wave.endX, 0);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, wave.color);
        gradient.addColorStop(0.7, wave.color);
        gradient.addColorStop(1, '#FFFFFF');
        ctx.strokeStyle = gradient;
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = 15;
      } else {
        ctx.strokeStyle = wave.color;
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawSegmentDividers(ctx: CanvasRenderingContext2D, h: number): void {
    if (this.waves.length < 2) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = SEGMENT_GAP;

    for (let i = 1; i < this.waves.length; i++) {
      const x = this.waves[i].startX - SEGMENT_GAP / 2;
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_PADDING_Y);
      ctx.lineTo(x, h - CANVAS_PADDING_Y);
      ctx.stroke();
    }
  }

  private drawCharLabels(ctx: CanvasRenderingContext2D, h: number): void {
    const midY = h / 2;
    ctx.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const wave of this.waves) {
      const segWidth = wave.endX - wave.startX;
      if (segWidth < 12) continue;

      const pulseMult = this.getPulseAmplitudeMultiplier(wave);
      const amp = wave.baseAmplitude * this.amplitudeScale * pulseMult;
      const labelY = midY + amp + 8;

      ctx.fillStyle = wave.isPulsing ? wave.color : 'rgba(180, 180, 220, 0.5)';
      ctx.fillText(wave.char, wave.centerX, labelY);
    }
  }

  private drawHoverGuide(ctx: CanvasRenderingContext2D, h: number): void {
    if (!this.hoverActive || this.hoverX < 0 || this.hoverX > this.canvasWidth) return;

    const x = Math.round(this.hoverX) + 0.5;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
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
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, PLAYHEAD_GLOW_RADIUS + 4);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    glowGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.beginPath();
    ctx.arc(x, y, PLAYHEAD_GLOW_RADIUS + 4, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
    ctx.restore();

    const coreGradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, PLAYHEAD_RADIUS + 1);
    coreGradient.addColorStop(0, '#FFFFCC');
    coreGradient.addColorStop(0.5, '#FFD700');
    coreGradient.addColorStop(1, '#FF8C00');

    ctx.beginPath();
    ctx.arc(x, y, PLAYHEAD_RADIUS + 1, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, PLAYHEAD_RADIUS - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.restore();
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
