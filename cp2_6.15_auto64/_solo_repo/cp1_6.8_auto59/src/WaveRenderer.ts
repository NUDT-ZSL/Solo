export class WaveRenderer {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private prevFrequencyData: Float32Array = new Float32Array(0);
  private readonly smoothing = 0.15;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.prevFrequencyData = new Float32Array(width);
  }

  render(frequencyData: Uint8Array, timeDomainData: Uint8Array): void {
    if (this.width === 0 || this.height === 0) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const centerY = h / 2;

    const binCount = frequencyData.length;
    const usableBins = Math.floor(binCount * 0.75);
    const step = usableBins / w;

    const smoothed = new Float32Array(w);
    for (let i = 0; i < w; i++) {
      const binIndex = Math.floor(i * step);
      const nextBin = Math.min(binIndex + 1, usableBins - 1);
      const frac = (i * step) - binIndex;
      const value = (frequencyData[binIndex] * (1 - frac) + frequencyData[nextBin] * frac) / 255;
      smoothed[i] = this.prevFrequencyData[i] + (value - this.prevFrequencyData[i]) * this.smoothing;
    }
    this.prevFrequencyData = smoothed;

    const layers = [
      { offset: 0, alpha: 0.6, amplitude: 1.0 },
      { offset: 2, alpha: 0.35, amplitude: 0.7 },
      { offset: -2, alpha: 0.25, amplitude: 0.5 },
    ];

    for (const layer of layers) {
      ctx.beginPath();
      for (let i = 0; i < w; i++) {
        const x = i;
        const normalizedVal = smoothed[i] * layer.amplitude;
        const y = centerY + normalizedVal * centerY * 0.8 + layer.offset;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = i - 1;
          const prevY = centerY + smoothed[i - 1] * layer.amplitude * centerY * 0.8 + layer.offset;
          const cpx = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpx, (prevY + y) / 2);
        }
      }

      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      const lowEnd = w * 0.3;
      const midEnd = w * 0.7;

      gradient.addColorStop(0, `rgba(255, 69, 0, ${layer.alpha})`);
      gradient.addColorStop(lowEnd / w * 0.5, `rgba(255, 140, 0, ${layer.alpha})`);
      gradient.addColorStop(lowEnd / w, `rgba(255, 200, 0, ${layer.alpha})`);
      gradient.addColorStop((lowEnd + midEnd) / 2 / w, `rgba(0, 255, 127, ${layer.alpha})`);
      gradient.addColorStop(midEnd / w, `rgba(50, 205, 50, ${layer.alpha})`);
      gradient.addColorStop((midEnd + w) / 2 / w, `rgba(138, 43, 226, ${layer.alpha})`);
      gradient.addColorStop(1, `rgba(65, 105, 225, ${layer.alpha})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5 - Math.abs(layer.offset) * 0.3;
      ctx.stroke();
    }

    const waveGradient = ctx.createLinearGradient(0, 0, w, 0);
    waveGradient.addColorStop(0, `rgba(255, 140, 0, 0.3)`);
    waveGradient.addColorStop(0.3, `rgba(0, 255, 127, 0.3)`);
    waveGradient.addColorStop(0.7, `rgba(138, 43, 226, 0.3)`);
    waveGradient.addColorStop(1, `rgba(65, 105, 225, 0.3)`);

    ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const x = i;
      const v = timeDomainData[Math.floor(i * timeDomainData.length / w)] / 128.0;
      const y = centerY + (v - 1) * centerY * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = waveGradient;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    this.renderGlow(smoothed, centerY, w);
  }

  private renderGlow(smoothed: Float32Array, centerY: number, w: number): void {
    const ctx = this.ctx;
    for (let i = 0; i < w; i += 4) {
      const val = smoothed[i];
      if (val > 0.3) {
        const x = i;
        const y = centerY + val * centerY * 0.8;
        const radius = val * 6;
        const progress = i / w;
        let r: number, g: number, b: number;
        if (progress < 0.3) {
          r = 255; g = 140; b = 0;
        } else if (progress < 0.7) {
          r = 0; g = 255; b = 127;
        } else {
          r = 138; g = 43; b = 226;
        }
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${val * 0.4})`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    }
  }
}
