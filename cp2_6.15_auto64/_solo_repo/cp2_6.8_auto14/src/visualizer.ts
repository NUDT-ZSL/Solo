export type VisualizerMode = 'waveform' | 'spectrum';

interface WaveformState {
  scrollOffset: number;
  lastWidth: number;
  lastHeight: number;
}

const waveformState: WaveformState = {
  scrollOffset: 0,
  lastWidth: 0,
  lastHeight: 0
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rainbowColor(index: number, total: number): string {
  const hue = (1 - index / total) * 0.78;
  const [r, g, b] = hslToRgb(hue, 0.9, 0.55);
  return `rgb(${r},${g},${b})`;
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  isStereo: boolean,
  channelData?: Float32Array[]
): void {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  if (waveformState.lastWidth !== width || waveformState.lastHeight !== height) {
    ctx.clearRect(0, 0, width, height);
    waveformState.lastWidth = width;
    waveformState.lastHeight = height;
  }

  const timeData = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(timeData);

  const scrollSpeed = 2;
  waveformState.scrollOffset = (waveformState.scrollOffset + scrollSpeed) % width;

  const clearWidth = Math.min(scrollSpeed + 4, width);
  ctx.clearRect(waveformState.scrollOffset - clearWidth, 0, clearWidth, height);

  const drawVerticalLine = (x: number) => {
    const dataIndex = Math.floor((x / width) * timeData.length);
    const safeIndex = Math.min(Math.max(dataIndex, 0), timeData.length - 1);
    const value = timeData[safeIndex];
    const normalized = (value - 128) / 128;
    const amplitude = Math.abs(normalized) * (height * 0.42);

    const gradient = ctx.createLinearGradient(0, height / 2 - amplitude, 0, height / 2 + amplitude);
    gradient.addColorStop(0, 'rgba(180, 220, 255, 0.95)');
    gradient.addColorStop(0.5, 'rgba(79, 195, 255, 1)');
    gradient.addColorStop(1, 'rgba(40, 90, 200, 0.95)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (isStereo && channelData && channelData.length >= 2) {
      const sampleIdx = Math.floor((x / width) * channelData[0].length);
      const safeSample = Math.min(Math.max(sampleIdx, 0), channelData[0].length - 1);
      const leftAmp = Math.abs(channelData[0][safeSample]) * (height * 0.4);
      const rightAmp = Math.abs(channelData[1][safeSample]) * (height * 0.4);

      ctx.moveTo(x, height / 2 - leftAmp);
      ctx.lineTo(x, height / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, height / 2);
      ctx.lineTo(x, height / 2 + rightAmp);
      ctx.stroke();
    } else {
      ctx.moveTo(x, height / 2 - amplitude);
      ctx.lineTo(x, height / 2 + amplitude);
      ctx.stroke();
    }
  };

  const drawX = waveformState.scrollOffset;
  drawVerticalLine(drawX);
}

export function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode
): void {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const bufferLength = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(freqData);

  const barGap = 2;
  const minBarWidth = 3;
  const barCount = Math.max(32, Math.floor((width + barGap) / (minBarWidth + barGap)));
  const barWidth = (width - (barCount - 1) * barGap) / barCount;

  const usableBins = Math.floor(bufferLength * 0.75);
  const binsPerBar = usableBins / barCount;

  for (let i = 0; i < barCount; i++) {
    const startBin = Math.floor(i * binsPerBar);
    const endBin = Math.floor((i + 1) * binsPerBar);
    let sum = 0;
    let count = 0;
    for (let j = startBin; j < endBin; j++) {
      if (j < bufferLength) {
        sum += freqData[j];
        count++;
      }
    }
    const avg = count > 0 ? sum / count : 0;
    const normalized = avg / 255;
    const barHeight = Math.max(1, normalized * (height * 0.85));

    const x = i * (barWidth + barGap);
    const y = height - barHeight;

    const color = rainbowColor(i, barCount);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    const radius = Math.min(barWidth / 2, 3);
    roundRect(ctx, x, y, barWidth, barHeight, radius);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
): void {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  waveformState.scrollOffset = 0;
  waveformState.lastWidth = 0;
  waveformState.lastHeight = 0;
}
