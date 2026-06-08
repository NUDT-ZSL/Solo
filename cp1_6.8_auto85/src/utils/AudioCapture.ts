export type EmotionResult = {
  emotion: 'happy' | 'sad' | 'calm' | 'angry';
  label: string;
};

const EMOTION_KEYWORDS: Record<Exclude<EmotionResult['emotion'], 'calm'>, { keywords: string[]; label: string }> = {
  happy: {
    keywords: ['开心', '快乐', '高兴', '哈哈', '喜', '幸福', '好', '棒', '赞', 'love', 'happy', 'joy', 'great', 'wonderful'],
    label: '开心',
  },
  sad: {
    keywords: ['难过', '伤心', '忧伤', '哭', '泪', '悲', '孤独', '寂寞', 'sad', 'cry', 'lonely', 'miss'],
    label: '忧伤',
  },
  angry: {
    keywords: ['生气', '愤怒', '火', '烦', '讨厌', '恨', 'angry', 'hate', 'mad', 'furious'],
    label: '愤怒',
  },
};

export function detectEmotion(text: string): EmotionResult {
  const lower = text.toLowerCase();
  for (const [emotion, config] of Object.entries(EMOTION_KEYWORDS) as [Exclude<EmotionResult['emotion'], 'calm'>, typeof EMOTION_KEYWORDS[Exclude<EmotionResult['emotion'], 'calm'>]][]) {
    if (config.keywords.some((kw) => lower.includes(kw))) {
      return { emotion, label: config.label } as EmotionResult;
    }
  }
  return { emotion: 'calm', label: '平静' };
}

export class AudioRecorder {
  isRecording = false;
  analyser: AnalyserNode | null = null;
  audioContext: AudioContext | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private volumeInterval: ReturnType<typeof setInterval> | null = null;
  private volumeSnapshots: number[] = [];
  private chunks: Blob[] = [];

  async startRecording(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    this.chunks = [];
    this.volumeSnapshots = [];
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    this.mediaRecorder.start(100);
    this.isRecording = true;

    this.volumeInterval = setInterval(() => {
      this.volumeSnapshots.push(this.getVolumeLevel());
    }, 100);
  }

  async stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('Not recording');
    }

    return new Promise<Blob>((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error('MediaRecorder is null');
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  getVolumeLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length / 255;
  }

  getVolumeData(): number[] {
    return [...this.volumeSnapshots];
  }

  private cleanup(): void {
    this.isRecording = false;
    if (this.volumeInterval !== null) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }
}

export function drawWaveform(canvas: HTMLCanvasElement, analyser: AnalyserNode, color = '#ffd700'): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw(): void {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();

    const sliceWidth = WIDTH / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 255;
      const y = (v * HEIGHT) / 2 + HEIGHT / 4;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0.0)`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  draw();
}

export function drawStaticWaveform(canvas: HTMLCanvasElement, volumeData: number[], color = '#ffd700'): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const len = volumeData.length;
  if (len === 0) return;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();

  const step = WIDTH / (len - 1 || 1);
  for (let i = 0; i < len; i++) {
    const x = i * step;
    const y = volumeData[i] * (HEIGHT / 2) + HEIGHT / 4;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0.0)`);
  ctx.fillStyle = gradient;
  ctx.fill();
}

export function playAudioPreview(blob: Blob, durationMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const timer = setTimeout(() => {
      audio.pause();
      URL.revokeObjectURL(url);
      resolve();
    }, durationMs);

    audio.onended = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve();
    };

    audio.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    };

    audio.play().catch(reject);
  });
}

export function playAudio(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    };

    audio.play().catch(reject);
  });
}

export async function mixAudioBlobs(blob1: Blob, blob2: Blob): Promise<Blob> {
  const ctx = new AudioContext();

  const [buf1, buf2] = await Promise.all([
    blob1.arrayBuffer().then((ab) => ctx.decodeAudioData(ab)),
    blob2.arrayBuffer().then((ab) => ctx.decodeAudioData(ab)),
  ]);

  const sampleRate = ctx.sampleRate;
  const channelCount = Math.min(buf1.numberOfChannels, buf2.numberOfChannels);
  const length = Math.max(buf1.length, buf2.length);

  const result = ctx.createBuffer(channelCount, length, sampleRate);

  for (let ch = 0; ch < channelCount; ch++) {
    const src1 = buf1.getChannelData(ch);
    const src2 = buf2.getChannelData(ch);
    const out = result.getChannelData(ch);

    for (let i = 0; i < length; i++) {
      const s1 = i < src1.length ? src1[i] : 0;
      const s2 = i < src2.length ? src2[i] : 0;
      out[i] = Math.max(-1, Math.min(1, s1 + s2));
    }
  }

  const offline = new OfflineAudioContext(channelCount, length, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = result;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();
  const wav = audioBufferToWav(rendered);
  await ctx.close();

  return new Blob([wav], { type: 'audio/wav' });
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitsPerSample = 16;
  const length = buffer.length;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = length * numChannels * (bitsPerSample / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
