export interface RenderOptions {
  backgroundColor?: string;
  waveColor?: string;
  lineWidth?: number;
  mutedOpacity?: number;
  fadeOverlayStartOpacity?: number;
}

export interface StaticRenderOptions extends RenderOptions {
  fadeInSec?: number;
  fadeOutSec?: number;
  totalDurationSec?: number;
  isMuted?: boolean;
  isSoloStripe?: boolean;
}

export class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private defaultOptions: Required<RenderOptions>;
  private realtimeBuffer: number[] = [];
  private realtimeMaxPoints: number;
  private lastRenderTime = 0;
  private readonly FRAME_INTERVAL = 1000 / 30;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, options: RenderOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;

    this.defaultOptions = {
      backgroundColor: '#1E1E1E',
      waveColor: '#FF6B6B',
      lineWidth: 1.5,
      mutedOpacity: 0.4,
      fadeOverlayStartOpacity: 0.8,
      ...options,
    };

    this.realtimeMaxPoints = 1000;
    this.setupCanvas();
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.setupCanvas();
  };

  private setupCanvas(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || this.canvas.clientWidth || 800;
    const height = rect.height || this.canvas.clientHeight || 120;

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);
  }

  public getWidth(): number {
    return this.canvas.width / this.dpr;
  }

  public getHeight(): number {
    return this.canvas.height / this.dpr;
  }

  public clear(): void {
    const width = this.getWidth();
    const height = this.getHeight();
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = this.defaultOptions.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);
    this.realtimeBuffer = [];
  }

  private drawBackground(): void {
    const width = this.getWidth();
    const height = this.getHeight();
    this.ctx.fillStyle = this.defaultOptions.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawCenterLine(): void {
    const width = this.getWidth();
    const height = this.getHeight();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
  }

  public async renderStatic(blob: Blob, options: StaticRenderOptions = {}): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    this.setupCanvas();
    this.drawBackground();
    this.drawCenterLine();

    try {
      const arrayBuffer = await blob.arrayBuffer();
      let audioBuffer: AudioBuffer;

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx({ sampleRate: 44100 });
        audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        await ctx.close();
      } catch {
        const fallbackCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioBuffer = await fallbackCtx.decodeAudioData(arrayBuffer.slice(0));
        await fallbackCtx.close();
      }

      const channelData = audioBuffer.getChannelData(0);
      const width = this.getWidth();
      const height = this.getHeight();
      const color = options.waveColor || opts.waveColor;

      this.drawWaveformFromSamples(channelData, width, height, color);

      this.applyAllOverlays(options, opts);
    } catch (err) {
      console.warn('Waveform decode failed, showing placeholder:', err);
      this.drawPlaceholder(options.waveColor || opts.waveColor);
      this.applyAllOverlays(options, opts);
    }
  }

  private applyAllOverlays(options: StaticRenderOptions, opts: Required<RenderOptions>): void {
    const fadeIn = options.fadeInSec;
    const fadeOut = options.fadeOutSec;
    const totalDur = options.totalDurationSec;

    if (fadeIn !== undefined && fadeOut !== undefined
        && totalDur !== undefined && totalDur > 0) {
      this.drawFadeOverlay(fadeIn, fadeOut, totalDur, opts.fadeOverlayStartOpacity);
    }

    if (options.isMuted) {
      this.applyMuteOverlay(opts.mutedOpacity);
    }

    if (options.isSoloStripe) {
      this.applySoloStripeOverlay();
    }
  }

  private drawWaveformFromSamples(samples: Float32Array, width: number, height: number, color: string): void {
    const bars = Math.min(width, 800);
    const samplesPerBar = Math.floor(samples.length / bars);
    const centerY = height / 2;
    const maxAmplitude = height / 2 - 2;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.defaultOptions.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();

    for (let i = 0; i < bars; i++) {
      let min = 1;
      let max = -1;
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, samples.length);

      for (let j = start; j < end; j++) {
        const s = samples[j];
        if (s < min) min = s;
        if (s > max) max = s;
      }

      const x = i;
      const yTop = centerY - Math.max(Math.abs(max), 0.005) * maxAmplitude;
      const yBottom = centerY + Math.max(Math.abs(min), 0.005) * maxAmplitude;

      this.ctx.moveTo(x, yTop);
      this.ctx.lineTo(x, yBottom);
    }

    this.ctx.stroke();
  }

  public renderRealtime(data: Float32Array | number[], waveColor?: string): void {
    const now = performance.now();
    if (now - this.lastRenderTime < this.FRAME_INTERVAL) {
      return;
    }
    this.lastRenderTime = now;

    const dataArr = Array.isArray(data) ? data : Array.from(data);
    let rms = 0;
    for (let i = 0; i < dataArr.length; i++) {
      rms += dataArr[i] * dataArr[i];
    }
    rms = Math.sqrt(rms / dataArr.length);
    const amplitude = Math.min(1, rms * 2.5);

    this.realtimeBuffer.push(amplitude);
    if (this.realtimeBuffer.length > this.realtimeMaxPoints) {
      this.realtimeBuffer.shift();
    }

    this.setupCanvas();
    this.drawBackground();
    this.drawCenterLine();

    const width = this.getWidth();
    const height = this.getHeight();
    const color = waveColor || this.defaultOptions.waveColor;
    const centerY = height / 2;
    const maxAmp = height / 2 - 2;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.defaultOptions.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();

    const bufLen = this.realtimeBuffer.length;
    const step = bufLen >= width ? bufLen / width : 1;

    for (let i = 0; i < width; i++) {
      const idx = Math.floor(i * step);
      if (idx >= bufLen) break;
      const amp = Math.max(this.realtimeBuffer[idx], 0.003);
      const x = i;
      const yTop = centerY - amp * maxAmp;
      const yBottom = centerY + amp * maxAmp;
      this.ctx.moveTo(x, yTop);
      this.ctx.lineTo(x, yBottom);
    }

    this.ctx.stroke();
  }

  public renderStaticEmpty(options: StaticRenderOptions = {}): void {
    this.setupCanvas();
    this.drawBackground();
    this.drawCenterLine();
    this.drawPlaceholder(options.waveColor || this.defaultOptions.waveColor);

    if (options.isMuted) {
      this.applyMuteOverlay(options.mutedOpacity || this.defaultOptions.mutedOpacity);
    }
    if (options.isSoloStripe) {
      this.applySoloStripeOverlay();
    }
  }

  private drawPlaceholder(color: string): void {
    const width = this.getWidth();
    const height = this.getHeight();
    const centerY = height / 2;
    const amp = 3;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.defaultOptions.lineWidth;
    this.ctx.globalAlpha = 0.25;
    this.ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const y = centerY + Math.sin(x * 0.05) * amp;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  private drawFadeOverlay(fadeInSec: number, fadeOutSec: number, totalDurationSec: number, startOpacity: number): void {
    if (totalDurationSec <= 0) return;

    const width = this.getWidth();
    const height = this.getHeight();
    const pixelsPer100ms = 10;
    const fadeInWidth = Math.max(0, Math.min(width * 0.5, fadeInSec * 10 * pixelsPer100ms));
    const fadeOutWidth = Math.max(0, Math.min(width * 0.5, fadeOutSec * 10 * pixelsPer100ms));

    if (fadeInWidth > 1 && fadeInSec > 0) {
      const grad = this.ctx.createLinearGradient(0, 0, fadeInWidth, 0);
      grad.addColorStop(0, `rgba(0, 0, 0, ${startOpacity})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, fadeInWidth, height);
    }

    if (fadeOutWidth > 1 && fadeOutSec > 0) {
      const startX = width - fadeOutWidth;
      const grad = this.ctx.createLinearGradient(startX, 0, width, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, `rgba(0, 0, 0, ${startOpacity})`);
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(startX, 0, fadeOutWidth, height);
    }
  }

  public applyMuteEffect(isMuted: boolean): void {
    if (isMuted) {
      this.applyMuteOverlay(this.defaultOptions.mutedOpacity);
    }
  }

  private applyMuteOverlay(opacity: number): void {
    const width = this.getWidth();
    const height = this.getHeight();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - opacity})`;
    this.ctx.fillRect(0, 0, width, height);
  }

  public applySoloEffect(isSoloed: boolean, otherSoloActive: boolean): void {
    if (!isSoloed && otherSoloActive) {
      this.applySoloStripeOverlay();
    }
  }

  private drawPattern(width: number, height: number): void {
    const stripeSpacing = 8;
    const lineWidth = 1;
    const diagonal = Math.sqrt(width * width + height * height);

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = lineWidth;

    this.ctx.beginPath();
    for (let x = -diagonal; x < width + diagonal; x += stripeSpacing) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + diagonal, diagonal);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }

  private applySoloStripeOverlay(): void {
    const width = this.getWidth();
    const height = this.getHeight();

    this.ctx.save();
    this.drawPattern(width, height);
    this.ctx.restore();
  }

  public applyFadeOverlay(fadeInSec: number, fadeOutSec: number, totalDurationSec: number): void {
    this.drawFadeOverlay(fadeInSec, fadeOutSec, totalDurationSec, this.defaultOptions.fadeOverlayStartOpacity);
  }

  public updateFadeAndEffects(options: StaticRenderOptions & { hasAudio?: boolean; channelData?: Float32Array }): void {
    const opts = { ...this.defaultOptions, ...options };
    this.setupCanvas();
    this.drawBackground();
    this.drawCenterLine();

    if (options.hasAudio && options.channelData) {
      const width = this.getWidth();
      const height = this.getHeight();
      this.drawWaveformFromSamples(options.channelData, width, height, options.waveColor || opts.waveColor);
    } else {
      this.drawPlaceholder(options.waveColor || opts.waveColor);
    }

    if (options.fadeInSec !== undefined && options.fadeOutSec !== undefined
        && options.totalDurationSec !== undefined && options.totalDurationSec > 0) {
      this.drawFadeOverlay(options.fadeInSec, options.fadeOutSec, options.totalDurationSec, opts.fadeOverlayStartOpacity);
    }

    if (options.isMuted) {
      this.applyMuteOverlay(opts.mutedOpacity);
    }
    if (options.isSoloStripe) {
      this.applySoloStripeOverlay();
    }
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.realtimeBuffer = [];
  }
}
