import { AudioFeatures } from './audioProcessor';

export interface ViewState {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface ColorStop {
  pos: number;
  r: number;
  g: number;
  b: number;
}

const LOW_COLORS: ColorStop[] = [
  { pos: 0, r: 10, g: 20, b: 80 },
  { pos: 0.2, r: 30, g: 40, b: 120 },
  { pos: 0.4, r: 60, g: 60, b: 160 },
  { pos: 0.6, r: 90, g: 70, b: 180 },
  { pos: 0.8, r: 120, g: 80, b: 200 },
  { pos: 1, r: 150, g: 90, b: 220 },
];

const MID_COLORS: ColorStop[] = [
  { pos: 0, r: 40, g: 140, b: 80 },
  { pos: 0.2, r: 60, g: 170, b: 90 },
  { pos: 0.4, r: 100, g: 200, b: 80 },
  { pos: 0.6, r: 160, g: 210, b: 60 },
  { pos: 0.8, r: 200, g: 200, b: 40 },
  { pos: 1, r: 230, g: 190, b: 30 },
];

const HIGH_COLORS: ColorStop[] = [
  { pos: 0, r: 230, g: 140, b: 30 },
  { pos: 0.2, r: 240, g: 110, b: 20 },
  { pos: 0.4, r: 250, g: 80, b: 20 },
  { pos: 0.6, r: 240, g: 50, b: 30 },
  { pos: 0.8, r: 220, g: 30, b: 40 },
  { pos: 1, r: 200, g: 20, b: 50 },
];

function interpolateColor(stops: ColorStop[], t: number): { r: number; g: number; b: number } {
  if (t <= stops[0].pos) return { r: stops[0].r, g: stops[0].g, b: stops[0].b };
  if (t >= stops[stops.length - 1].pos) {
    const last = stops[stops.length - 1];
    return { r: last.r, g: last.g, b: last.b };
  }
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      const span = stops[i + 1].pos - stops[i].pos;
      const frac = (t - stops[i].pos) / span;
      return {
        r: Math.round(stops[i].r + (stops[i + 1].r - stops[i].r) * frac),
        g: Math.round(stops[i].g + (stops[i + 1].g - stops[i].g) * frac),
        b: Math.round(stops[i].b + (stops[i + 1].b - stops[i].b) * frac),
      };
    }
  }
  return { r: 128, g: 128, b: 128 };
}

function getFrequencyColor(freqRatio: number, intensity: number): string {
  let palette: ColorStop[];
  let localT: number;

  if (freqRatio < 1 / 3) {
    palette = LOW_COLORS;
    localT = freqRatio * 3;
  } else if (freqRatio < 2 / 3) {
    palette = MID_COLORS;
    localT = (freqRatio - 1 / 3) * 3;
  } else {
    palette = HIGH_COLORS;
    localT = (freqRatio - 2 / 3) * 3;
  }

  const { r, g, b } = interpolateColor(palette, localT);
  const alpha = Math.max(0.05, Math.min(1, intensity));
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

export function getColorLegendGradientId(): string {
  return 'spectrogram-gradient';
}

export function generateColorLegendSVG(): string {
  const stops = [
    { offset: '0%', color: '#0a1450', label: '低频 0Hz' },
    { offset: '16.67%', color: '#3c46a8' },
    { offset: '33.33%', color: '#965adc' },
    { offset: '50%', color: '#64c850' },
    { offset: '66.67%', color: '#e6c81e' },
    { offset: '83.33%', color: '#f68e2e' },
    { offset: '100%', color: '#c81432', label: '高频 22kHz' },
  ];
  let svg = `<defs><linearGradient id="${getColorLegendGradientId()}" x1="0%" y1="100%" x2="0%" y2="0%">`;
  for (const s of stops) {
    svg += `<stop offset="${s.offset}" stop-color="${s.color}" />`;
  }
  svg += `</linearGradient></defs>`;
  return svg;
}

export interface SpectrogramRenderOptions {
  width: number;
  height: number;
  interactive?: boolean;
  includeLegend?: boolean;
  title?: string;
}

export function generateSpectrogramSVG(
  features: AudioFeatures,
  view: ViewState,
  options: SpectrogramRenderOptions
): {
  svg: string;
  svgWidth: number;
  svgHeight: number;
} {
  const { width, height, includeLegend = true, title } = options;
  const timeSteps = features.timeSteps;
  const freqBins = features.freqBins;
  const volume = features.volume;

  const legendWidth = includeLegend ? 60 : 0;
  const topPadding = title ? 50 : 20;
  const bottomPadding = 40;
  const leftPadding = 60;
  const rightPadding = 20 + legendWidth;

  const plotWidth = width - leftPadding - rightPadding;
  const plotHeight = height - topPadding - bottomPadding;

  const totalWidth = plotWidth * view.scaleX;
  const totalHeight = plotHeight * view.scaleY;

  const visibleStartT = Math.max(0, Math.min(timeSteps - 1, Math.floor((-view.offsetX / totalWidth) * timeSteps)));
  const visibleEndT = Math.max(visibleStartT + 1, Math.min(timeSteps, Math.ceil(((-view.offsetX + plotWidth) / totalWidth) * timeSteps)));
  const visibleStartF = Math.max(0, Math.min(freqBins - 1, Math.floor((-view.offsetY / totalHeight) * freqBins)));
  const visibleEndF = Math.max(visibleStartF + 1, Math.min(freqBins, Math.ceil(((-view.offsetY + plotHeight) / totalHeight) * freqBins)));

  const baseBandWidth = totalWidth / timeSteps;
  const baseBandHeight = totalHeight / freqBins;

  let svgContent = '';

  svgContent += `<rect x="0" y="0" width="${width}" height="${height}" fill="#16213e" />`;

  svgContent += generateColorLegendSVG();

  if (title) {
    svgContent += `<text x="${width / 2}" y="30" fill="#e0e0e0" font-size="18" font-weight="bold" text-anchor="middle" font-family="Arial,sans-serif">${title}</text>`;
  }

  const clipPathId = 'plot-clip';
  svgContent += `<clipPath id="${clipPathId}"><rect x="${leftPadding}" y="${topPadding}" width="${plotWidth}" height="${plotHeight}" /></clipPath>`;

  svgContent += `<g clip-path="url(#${clipPathId})">`;

  const tStart = Math.max(0, visibleStartT);
  const tEnd = Math.min(timeSteps, visibleEndT);
  const fStart = Math.max(0, visibleStartF);
  const fEnd = Math.min(freqBins, visibleEndF);

  const stft = features.stft;

  for (let t = tStart; t < tEnd; t++) {
    const xBase = leftPadding + view.offsetX + t * baseBandWidth;
    const vol = volume[t] !== undefined ? volume[t] : 0.5;
    const widthFactor = 0.6 + vol * 0.8;
    const bandX = xBase + (baseBandWidth * (1 - widthFactor)) / 2;
    const bandW = Math.max(1, baseBandWidth * widthFactor);

    for (let f = fStart; f < fEnd; f++) {
      const freqRatio = 1 - f / freqBins;
      const intensity = stft[t] ? (stft[t][f] ?? 0) : 0;
      const alpha = 0.3 + 0.7 * vol * intensity;
      const color = getFrequencyColor(freqRatio, intensity);
      const y = topPadding + view.offsetY + (freqBins - f - 1) * baseBandHeight;
      svgContent += `<rect x="${bandX.toFixed(2)}" y="${y.toFixed(2)}" width="${bandW.toFixed(2)}" height="${(baseBandHeight + 0.5).toFixed(2)}" fill="${color}" />`;
    }
  }

  svgContent += `</g>`;

  svgContent += `<line x1="${leftPadding}" y1="${topPadding}" x2="${leftPadding + plotWidth}" y2="${topPadding}" stroke="#4a5568" stroke-width="1" />`;
  svgContent += `<line x1="${leftPadding}" y1="${topPadding + plotHeight}" x2="${leftPadding + plotWidth}" y2="${topPadding + plotHeight}" stroke="#4a5568" stroke-width="1" />`;
  svgContent += `<line x1="${leftPadding}" y1="${topPadding}" x2="${leftPadding}" y2="${topPadding + plotHeight}" stroke="#4a5568" stroke-width="1" />`;
  svgContent += `<line x1="${leftPadding + plotWidth}" y1="${topPadding}" x2="${leftPadding + plotWidth}" y2="${topPadding + plotHeight}" stroke="#4a5568" stroke-width="1" />`;

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const y = topPadding + plotHeight - (i / yTicks) * plotHeight;
    const freq = Math.round((i / yTicks) * features.freqMax);
    const label = freq >= 1000 ? `${(freq / 1000).toFixed(0)}k` : `${freq}`;
    svgContent += `<line x1="${leftPadding - 5}" y1="${y}" x2="${leftPadding}" y2="${y}" stroke="#4a5568" stroke-width="1" />`;
    svgContent += `<text x="${leftPadding - 8}" y="${y + 4}" fill="#a0aec0" font-size="11" text-anchor="end" font-family="Arial,sans-serif">${label}Hz</text>`;
  }

  const xTicks = 6;
  for (let i = 0; i <= xTicks; i++) {
    const x = leftPadding + (i / xTicks) * plotWidth;
    const timeLabel = (i / xTicks) * features.duration;
    svgContent += `<line x1="${x}" y1="${topPadding + plotHeight}" x2="${x}" y2="${topPadding + plotHeight + 5}" stroke="#4a5568" stroke-width="1" />`;
    svgContent += `<text x="${x}" y="${topPadding + plotHeight + 20}" fill="#a0aec0" font-size="11" text-anchor="middle" font-family="Arial,sans-serif">${timeLabel.toFixed(1)}s</text>`;
  }

  svgContent += `<text x="${leftPadding + plotWidth / 2}" y="${height - 8}" fill="#a0aec0" font-size="12" text-anchor="middle" font-family="Arial,sans-serif">时间 →</text>`;
  svgContent += `<text x="15" y="${topPadding + plotHeight / 2}" fill="#a0aec0" font-size="12" text-anchor="middle" font-family="Arial,sans-serif" transform="rotate(-90 15 ${topPadding + plotHeight / 2})">频率 ↑</text>`;

  if (includeLegend) {
    const legendX = leftPadding + plotWidth + 30;
    const legendGradId = 'legend-grad';
    svgContent += `<defs><linearGradient id="${legendGradId}" x1="0%" y1="100%" x2="0%" y2="0%">`;
    const legendStops = [
      { o: '0%', c: '#0a1450' }, { o: '16.67%', c: '#3c46a8' }, { o: '33.33%', c: '#965adc' },
      { o: '50%', c: '#64c850' }, { o: '66.67%', c: '#e6c81e' }, { o: '83.33%', c: '#f68e2e' }, { o: '100%', c: '#c81432' },
    ];
    for (const s of legendStops) {
      svgContent += `<stop offset="${s.o}" stop-color="${s.c}" />`;
    }
    svgContent += `</linearGradient></defs>`;
    svgContent += `<rect x="${legendX}" y="${topPadding}" width="20" height="${plotHeight}" fill="url(#${legendGradId})" />`;
    svgContent += `<text x="${legendX + 10}" y="${topPadding - 8}" fill="#a0aec0" font-size="10" text-anchor="middle" font-family="Arial,sans-serif">高频</text>`;
    svgContent += `<text x="${legendX + 10}" y="${topPadding + plotHeight + 15}" fill="#a0aec0" font-size="10" text-anchor="middle" font-family="Arial,sans-serif">低频</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`;

  return { svg, svgWidth: width, svgHeight: height };
}

export function bilinearInterpolate(
  data: number[][],
  targetT: number,
  targetF: number
): number {
  const t0 = Math.floor(targetT);
  const t1 = Math.min(data.length - 1, t0 + 1);
  const f0 = Math.floor(targetF);
  const f1 = Math.min(data[0] ? data[0].length - 1 : 0, f0 + 1);
  const tf = targetT - t0;
  const ff = targetF - f0;
  const v00 = data[t0]?.[f0] ?? 0;
  const v10 = data[t1]?.[f0] ?? 0;
  const v01 = data[t0]?.[f1] ?? 0;
  const v11 = data[t1]?.[f1] ?? 0;
  const v0 = v00 * (1 - tf) + v10 * tf;
  const v1 = v01 * (1 - tf) + v11 * tf;
  return v0 * (1 - ff) + v1 * ff;
}

export function exportToPNG(
  svgElement: SVGSVGElement,
  filename: string = 'spectrogram.png',
  scale: number = 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgElement.clientWidth * scale;
        canvas.height = svgElement.clientHeight * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.scale(scale, scale);
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('PNG blob creation failed'));
            return;
          }
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
          resolve();
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}

export async function exportToGIF(
  features: AudioFeatures,
  width: number,
  height: number,
  filename: string = 'spectrogram.gif',
  durationSec: number = 3,
  fps: number = 10
): Promise<void> {
  const totalFrames = durationSec * fps;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  const frames: string[] = [];
  const timeSteps = features.timeSteps;
  const freqBins = features.freqBins;
  const volume = features.volume;
  const stft = features.stft;

  for (let frame = 0; frame < totalFrames; frame++) {
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, width, height);

    const phase = (frame / totalFrames) * Math.PI * 2;
    const pulse = 0.8 + 0.2 * Math.sin(phase);

    const plotX = 60;
    const plotY = 40;
    const plotW = width - plotX - 60;
    const plotH = height - plotY - 40;
    const bandW = plotW / timeSteps;
    const bandH = plotH / freqBins;

    const sampleStart = Math.floor((frame / totalFrames) * Math.max(0, timeSteps - Math.floor(timeSteps * 0.3)));
    const sampleEnd = Math.min(timeSteps, sampleStart + Math.floor(timeSteps * 0.3));
    if (sampleEnd <= sampleStart) continue;

    for (let t = sampleStart; t < sampleEnd; t++) {
      const tNorm = (t - sampleStart) / (sampleEnd - sampleStart);
      const x = plotX + tNorm * plotW;
      const vol = volume[t] ?? 0.5;
      const wFactor = 0.6 + vol * 0.8 * pulse;
      const bW = Math.max(1, bandW * wFactor);

      for (let f = 0; f < freqBins; f++) {
        const freqRatio = 1 - f / freqBins;
        const intensity = stft[t]?.[f] ?? 0;
        const y = plotY + freqRatio * plotH;

        let r: number, g: number, b: number;
        if (freqRatio > 2 / 3) {
          const local = (freqRatio - 2 / 3) * 3;
          r = 230 - 30 * local; g = 140 - 120 * local; b = 30 + 20 * local;
        } else if (freqRatio > 1 / 3) {
          const local = (freqRatio - 1 / 3) * 3;
          r = 40 + 190 * local; g = 140 + 50 * local; b = 80 - 50 * local;
        } else {
          const local = freqRatio * 3;
          r = 10 + 140 * local; g = 20 + 70 * local; b = 80 + 140 * local;
        }

        const alpha = Math.max(0.1, Math.min(1, 0.3 + 0.7 * vol * intensity));
        ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha.toFixed(3)})`;
        ctx.fillRect(x, y, bW, bandH + 1);
      }
    }

    frames.push(canvas.toDataURL('image/png'));
  }

  const frameImages: HTMLImageElement[] = [];
  for (const f of frames) {
    const img = new Image();
    img.src = f;
    frameImages.push(img);
  }

  const gifCanvas = document.createElement('canvas');
  gifCanvas.width = width;
  gifCanvas.height = height;
  const gifCtx = gifCanvas.getContext('2d');
  if (!gifCtx) {
    throw new Error('GIF canvas context unavailable');
  }

  let frameIndex = 0;
  const playNext = () => {
    if (frameIndex >= frameImages.length) {
      gifCanvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 'image/png');
      return;
    }
    gifCtx.drawImage(frameImages[frameIndex], 0, 0);
    frameIndex++;
    setTimeout(playNext, 1000 / fps);
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      playNext();
      setTimeout(resolve, (totalFrames * 1000) / fps + 500);
    }, 100);
  });
}
