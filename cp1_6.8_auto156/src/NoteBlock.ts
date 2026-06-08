import { type NoteData, PITCH_FREQUENCIES, RHYTHM_BEATS, type PitchName, type RhythmType } from './types';

const NEON_BLUE = '#00d4ff';
const NEON_PURPLE = '#b44aff';
const NEON_PINK = '#ff2d7b';

export function createNoteData(pitch: PitchName, rhythm: RhythmType, octave: number = 4): NoteData {
  const baseFreq = PITCH_FREQUENCIES[pitch];
  const frequency = baseFreq * Math.pow(2, octave - 4);
  return {
    pitch,
    octave,
    rhythm,
    frequency,
    beatDuration: RHYTHM_BEATS[rhythm],
  };
}

export function renderNoteBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  note: NoteData,
  scale: number,
  pulseIntensity: number,
  hexSize: number
): void {
  const blockSize = hexSize * 0.65 * scale;
  if (blockSize < 1) return;

  ctx.save();
  ctx.translate(x, y);

  const grad = ctx.createLinearGradient(-blockSize, -blockSize, blockSize, blockSize);
  const alpha = 0.85 + pulseIntensity * 0.15;
  grad.addColorStop(0, NEON_BLUE);
  grad.addColorStop(1, NEON_PURPLE);

  ctx.shadowColor = pulseIntensity > 0.5 ? NEON_PINK : NEON_BLUE;
  ctx.shadowBlur = 12 + pulseIntensity * 20;

  const r = blockSize * 0.2;
  ctx.beginPath();
  ctx.moveTo(-blockSize + r, -blockSize * 0.7);
  ctx.lineTo(blockSize - r, -blockSize * 0.7);
  ctx.arcTo(blockSize, -blockSize * 0.7, blockSize, -blockSize * 0.7 + r, r);
  ctx.lineTo(blockSize, blockSize * 0.7 - r);
  ctx.arcTo(blockSize, blockSize * 0.7, blockSize - r, blockSize * 0.7, r);
  ctx.lineTo(-blockSize + r, blockSize * 0.7);
  ctx.arcTo(-blockSize, blockSize * 0.7, -blockSize, blockSize * 0.7 - r, r);
  ctx.lineTo(-blockSize, -blockSize * 0.7 + r);
  ctx.arcTo(-blockSize, -blockSize * 0.7, -blockSize + r, -blockSize * 0.7, r);
  ctx.closePath();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(8, blockSize * 0.5)}px "Exo 2", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(note.pitch + note.octave, 0, -blockSize * 0.15);

  const rhythmSymbol: Record<string, string> = { whole: '𝅝', half: '𝅗𝅥', quarter: '♩', eighth: '♪' };
  ctx.font = `${Math.max(6, blockSize * 0.35)}px "Exo 2", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(rhythmSymbol[note.rhythm] || '♩', 0, blockSize * 0.3);

  ctx.restore();
}

export function renderGhostBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hexSize: number
): void {
  const blockSize = hexSize * 0.65;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.35;

  const grad = ctx.createLinearGradient(-blockSize, -blockSize, blockSize, blockSize);
  grad.addColorStop(0, NEON_BLUE);
  grad.addColorStop(1, NEON_PURPLE);

  ctx.shadowColor = NEON_BLUE;
  ctx.shadowBlur = 15;

  const r = blockSize * 0.2;
  ctx.beginPath();
  ctx.moveTo(-blockSize + r, -blockSize * 0.7);
  ctx.lineTo(blockSize - r, -blockSize * 0.7);
  ctx.arcTo(blockSize, -blockSize * 0.7, blockSize, -blockSize * 0.7 + r, r);
  ctx.lineTo(blockSize, blockSize * 0.7 - r);
  ctx.arcTo(blockSize, blockSize * 0.7, blockSize - r, blockSize * 0.7, r);
  ctx.lineTo(-blockSize + r, blockSize * 0.7);
  ctx.arcTo(-blockSize, blockSize * 0.7, -blockSize, blockSize * 0.7 - r, r);
  ctx.lineTo(-blockSize, -blockSize * 0.7 + r);
  ctx.arcTo(-blockSize, -blockSize * 0.7, -blockSize + r, -blockSize * 0.7, r);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

export function renderConnection(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  intensity: number
): void {
  ctx.save();
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  const alpha = 0.25 + intensity * 0.6;
  grad.addColorStop(0, `rgba(0,212,255,${alpha})`);
  grad.addColorStop(1, `rgba(180,74,255,${alpha})`);

  ctx.strokeStyle = grad;
  ctx.lineWidth = 2 + intensity * 3;
  ctx.shadowColor = intensity > 0.3 ? NEON_PINK : NEON_BLUE;
  ctx.shadowBlur = 4 + intensity * 16;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  if (intensity > 0.1) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const pulseR = 4 + intensity * 8;
    const pulseGrad = ctx.createRadialGradient(mx, my, 0, mx, my, pulseR);
    pulseGrad.addColorStop(0, `rgba(255,45,123,${intensity * 0.7})`);
    pulseGrad.addColorStop(1, 'rgba(255,45,123,0)');
    ctx.fillStyle = pulseGrad;
    ctx.beginPath();
    ctx.arc(mx, my, pulseR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function renderActiveRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hexSize: number,
  intensity: number
): void {
  ctx.save();
  ctx.strokeStyle = NEON_PINK;
  ctx.lineWidth = 3;
  ctx.shadowColor = NEON_PINK;
  ctx.shadowBlur = 20 + intensity * 20;
  ctx.globalAlpha = 0.5 + intensity * 0.5;

  ctx.beginPath();
  ctx.arc(x, y, hexSize * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
