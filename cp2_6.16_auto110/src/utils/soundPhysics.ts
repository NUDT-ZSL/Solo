export interface SoundSource {
  id: string;
  x: number;
  z: number;
  frequency: number;
  amplitude: number;
  phase: number;
}

export interface Ripple {
  id: string;
  sourceId: string;
  birthTime: number;
  radius: number;
  opacity: number;
}

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;
const RIPPLE_LIFETIME = 4;
const RIPPLE_INTERVAL = 0.5;
const MAX_RIPPLES_PER_SOURCE = 20;

export function frequencyToColor(frequency: number): string {
  const t = Math.min(Math.max((frequency - MIN_FREQ) / (MAX_FREQ - MIN_FREQ), 0), 1);
  const r1 = 255, g1 = 71, b1 = 87;
  const r2 = 108, g2 = 92, b2 = 231;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function frequencyToSpeed(frequency: number): number {
  const t = Math.min(Math.max((frequency - MIN_FREQ) / (MAX_FREQ - MIN_FREQ), 0), 1);
  return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * t;
}

export function calculateRippleRadius(birthTime: number, currentTime: number, frequency: number): number {
  const elapsed = currentTime - birthTime;
  const speed = frequencyToSpeed(frequency);
  return speed * elapsed;
}

export function calculateRippleOpacity(birthTime: number, currentTime: number): number {
  const elapsed = currentTime - birthTime;
  const progress = Math.min(elapsed / RIPPLE_LIFETIME, 1);
  return Math.max(1 - progress, 0);
}

export function shouldSpawnRipple(lastSpawnTime: number, currentTime: number): boolean {
  return currentTime - lastSpawnTime >= RIPPLE_INTERVAL;
}

export function calculateInterference(
  sourceA: SoundSource,
  sourceB: SoundSource,
  pointX: number,
  pointZ: number,
  currentTime: number
): { amplitude: number; type: 'constructive' | 'destructive' | 'neutral' } {
  const distA = Math.sqrt((pointX - sourceA.x) ** 2 + (pointZ - sourceA.z) ** 2);
  const distB = Math.sqrt((pointX - sourceB.x) ** 2 + (pointZ - sourceB.z) ** 2);

  const wavelengthA = frequencyToSpeed(sourceA.frequency) / (sourceA.frequency / 1000);
  const wavelengthB = frequencyToSpeed(sourceB.frequency) / (sourceB.frequency / 1000);

  const phaseA = (distA / wavelengthA) * 2 * Math.PI + (sourceA.phase * Math.PI) / 180;
  const phaseB = (distB / wavelengthB) * 2 * Math.PI + (sourceB.phase * Math.PI) / 180;

  const waveA = Math.sin(currentTime * sourceA.frequency * 0.01 - phaseA) * sourceA.amplitude / 100;
  const waveB = Math.sin(currentTime * sourceB.frequency * 0.01 - phaseB) * sourceB.amplitude / 100;

  const combined = waveA + waveB;
  const maxAmplitude = (sourceA.amplitude + sourceB.amplitude) / 100;

  const ratio = maxAmplitude > 0 ? Math.abs(combined) / maxAmplitude : 0;

  let type: 'constructive' | 'destructive' | 'neutral' = 'neutral';
  if (ratio > 0.7) type = 'constructive';
  else if (ratio < 0.3) type = 'destructive';

  return { amplitude: Math.abs(combined), type };
}

export function calculateSoundPressureLevel(sources: SoundSource[], currentTime: number): number[] {
  const samples: number[] = [];
  const numSamples = 128;
  
  for (let i = 0; i < numSamples; i++) {
    const angle = (i / numSamples) * Math.PI * 2;
    const radius = 3;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    
    let totalPressure = 0;
    for (const source of sources) {
      const dist = Math.sqrt((px - source.x) ** 2 + (pz - source.z) ** 2);
      const wavelength = frequencyToSpeed(source.frequency) / (source.frequency / 1000);
      const phase = (dist / wavelength) * 2 * Math.PI + (source.phase * Math.PI) / 180;
      const attenuation = Math.max(1 / (1 + dist * 0.5), 0.1);
      totalPressure += Math.sin(currentTime * source.frequency * 0.01 - phase) * (source.amplitude / 100) * attenuation;
    }
    samples.push(totalPressure);
  }
  
  return samples;
}

export function calculateFrequencySpectrum(
  sources: SoundSource[],
  timeWindow: number,
  sampleRate: number = 60
): { frequencies: number[]; magnitudes: number[] } {
  const numBins = 64;
  const frequencies: number[] = [];
  const magnitudes: number[] = [];

  const minFreqLog = Math.log10(MIN_FREQ);
  const maxFreqLog = Math.log10(MAX_FREQ);

  for (let i = 0; i < numBins; i++) {
    const freqLog = minFreqLog + (maxFreqLog - minFreqLog) * (i / numBins);
    const freq = Math.pow(10, freqLog);
    frequencies.push(freq);

    let magnitude = 0;
    for (const source of sources) {
      const freqDiff = Math.abs(source.frequency - freq);
      const bandwidth = freq * 0.1;
      if (freqDiff < bandwidth) {
        magnitude += (source.amplitude / 100) * (1 - freqDiff / bandwidth);
      }
    }
    magnitudes.push(magnitude);
  }

  return { frequencies, magnitudes };
}

export const constants = {
  MIN_FREQ,
  MAX_FREQ,
  MIN_SPEED,
  MAX_SPEED,
  RIPPLE_LIFETIME,
  RIPPLE_INTERVAL,
  MAX_RIPPLES_PER_SOURCE,
  MAX_SOURCES: 8,
  GRID_SIZE: 10,
  GRID_DIVISIONS: 20
};
