export interface AudioFeatures {
  volume: number;
  pitch: number;
  speed: number;
  gradient: ColorGradient;
  waveform: number[];
}

export interface ColorGradient {
  start: string;
  end: string;
  label: string;
}

const GRADIENT_PRESETS: ColorGradient[] = [
  { start: '#ff4444', end: '#ff8800', label: '热烈红橙' },
  { start: '#00cccc', end: '#4488ff', label: '平静蓝绿' },
  { start: '#8855aa', end: '#778899', label: '忧郁紫灰' },
];

export class AudioAnalyzer {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new AudioContext();
  }

  async analyze(blob: Blob): Promise<AudioFeatures> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const data = audioBuffer.getChannelData(0);

    const volume = this.computeVolume(data);
    const pitch = this.computePitch(data, audioBuffer.sampleRate);
    const speed = this.computeSpeed(data, audioBuffer.duration);
    const gradient = this.mapToGradient(volume, pitch, speed);
    const waveform = this.extractWaveform(data, 120);

    return { volume, pitch, speed, gradient, waveform };
  }

  private computeVolume(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(rms * 5, 1);
  }

  private computePitch(data: Float32Array, sampleRate: number): number {
    const blockSize = 2048;
    const correlation = new Float32Array(blockSize);
    let bestOffset = 0;
    let bestCorrelation = 0;
    let foundGoodCorrelation = false;

    const slice = data.slice(0, blockSize);

    for (let offset = 1; offset < blockSize / 2; offset++) {
      let corr = 0;
      for (let i = 0; i < blockSize / 2; i++) {
        corr += slice[i] * slice[i + offset];
      }
      correlation[offset] = corr;

      if (corr > 0.9 * correlation[1] && !foundGoodCorrelation) {
        foundGoodCorrelation = true;
      }
      if (foundGoodCorrelation && corr > bestCorrelation) {
        bestCorrelation = corr;
        bestOffset = offset;
      }
    }

    if (bestOffset === 0) return 0.5;
    const pitchHz = sampleRate / bestOffset;
    return Math.min(pitchHz / 500, 1);
  }

  private computeSpeed(data: Float32Array, duration: number): number {
    let zeroCrossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const rate = zeroCrossings / duration;
    return Math.min(rate / 200, 1);
  }

  private mapToGradient(volume: number, pitch: number, speed: number): ColorGradient {
    const score0 = volume * 0.5 + speed * 0.5;
    const score1 = (1 - volume) * 0.4 + (1 - speed) * 0.3 + (1 - pitch) * 0.3;
    const score2 = (1 - volume) * 0.3 + (1 - speed) * 0.3 + pitch * 0.4;

    const scores = [score0, score1, score2];
    const maxIndex = scores.indexOf(Math.max(...scores));
    return { ...GRADIENT_PRESETS[maxIndex] };
  }

  private extractWaveform(data: Float32Array, samples: number): number[] {
    const blockSize = Math.floor(data.length / samples);
    const waveform: number[] = [];
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(data[start + j]);
      }
      waveform.push(sum / blockSize);
    }
    const max = Math.max(...waveform, 0.001);
    return waveform.map((v) => v / max);
  }

  static mixGradients(a: ColorGradient, b: ColorGradient): ColorGradient {
    const mixHex = (c1: string, c2: string) => {
      const r1 = parseInt(c1.slice(1, 3), 16);
      const g1 = parseInt(c1.slice(3, 5), 16);
      const b1 = parseInt(c1.slice(5, 7), 16);
      const r2 = parseInt(c2.slice(1, 3), 16);
      const g2 = parseInt(c2.slice(3, 5), 16);
      const b2 = parseInt(c2.slice(5, 7), 16);
      const r = Math.round((r1 + r2) / 2);
      const g = Math.round((g1 + g2) / 2);
      const bl = Math.round((b1 + b2) / 2);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
    };
    return {
      start: mixHex(a.start, b.start),
      end: mixHex(a.end, b.end),
      label: `${a.label}·${b.label}`,
    };
  }

  destroy(): void {
    this.audioContext.close();
  }
}
