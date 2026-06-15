import { v4 as uuidv4 } from 'uuid';

export interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  waveformData: Float32Array;
  notes: string;
}

type WaveformCallback = (timeData: Float32Array, freqData: Uint8Array) => void;
type SegmentsCallback = (segments: Segment[]) => void;
type PlaybackProgressCallback = (currentTime: number) => void;

const SILENCE_THRESHOLD = 0.03;
const SILENCE_DURATION_MS = 1000;
const ANALYSER_FFT_SIZE = 1024;
const SAMPLE_RATE = 44100;
const WAVEFORM_DOWNSAMPLE_TARGET = 240;

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  private _isRecording = false;
  private recordingStartTimestamp = 0;

  private recordedBuffers: Float32Array[] = [];
  private totalSampleCount = 0;

  private currentSegmentStartSample = 0;
  private silenceStartSample = -1;
  private silenceSampleThreshold: number;

  private _segments: Segment[] = [];

  private waveformCallback: WaveformCallback | null = null;
  private segmentsCallback: SegmentsCallback | null = null;
  private playbackProgressCallback: PlaybackProgressCallback | null = null;

  private animFrameId: number | null = null;

  private audioBuffer: AudioBuffer | null = null;
  private playbackSource: AudioBufferSourceNode | null = null;
  private playbackStartTime = 0;
  private playbackOffset = 0;
  private isPlaying = false;
  private playbackAnimFrameId: number | null = null;
  private currentPlaybackSegmentId: string | null = null;

  constructor() {
    this.silenceSampleThreshold = (SAMPLE_RATE * SILENCE_DURATION_MS) / 1000;
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  get segments(): Segment[] {
    return this._segments;
  }

  get currentPlayingSegmentId(): string | null {
    return this.currentPlaybackSegmentId;
  }

  onWaveformUpdate(cb: WaveformCallback) {
    this.waveformCallback = cb;
  }

  onSegmentsUpdate(cb: SegmentsCallback) {
    this.segmentsCallback = cb;
  }

  onPlaybackProgress(cb: PlaybackProgressCallback) {
    this.playbackProgressCallback = cb;
  }

  async startRecording(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE,
        },
      });
    } catch (err) {
      throw new Error('无法获取麦克风权限，请检查浏览器设置');
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = ANALYSER_FFT_SIZE;
    this.analyserNode.smoothingTimeConstant = 0.6;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    const bufferSize = 4096;
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this._isRecording) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(inputData);
      this.recordedBuffers.push(copy);
      this.totalSampleCount += copy.length;
      this.detectSilence(copy);
    };

    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    this._isRecording = true;
    this.recordingStartTimestamp = this.audioContext.currentTime;
    this.recordedBuffers = [];
    this.totalSampleCount = 0;
    this.currentSegmentStartSample = 0;
    this.silenceStartSample = -1;
    this._segments = [];

    this.startWaveformAnimation();

    this.segmentsCallback?.(this._segments);
  }

  stopRecording(): void {
    if (!this._isRecording) return;

    this._isRecording = false;

    this.finalizeLastSegment();

    this.buildFullAudioBuffer();

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.segmentsCallback?.([...this._segments]);
  }

  playSegment(segmentId: string): void {
    const seg = this._segments.find((s) => s.id === segmentId);
    if (!seg || !this.audioContext || !this.audioBuffer) return;

    this.stopPlayback();

    this.playbackSource = this.audioContext.createBufferSource();
    this.playbackSource.buffer = this.audioBuffer;

    const playbackGain = this.audioContext.createGain();
    playbackGain.gain.value = 1.0;
    this.playbackSource.connect(playbackGain);
    playbackGain.connect(this.audioContext.destination);

    const duration = seg.endTime - seg.startTime;
    this.playbackOffset = seg.startTime;
    this.playbackStartTime = this.audioContext.currentTime;
    this.currentPlaybackSegmentId = segmentId;
    this.isPlaying = true;

    this.playbackSource.start(0, seg.startTime, duration);
    this.playbackSource.onended = () => {
      this.isPlaying = false;
      this.playbackSource = null;
      this.currentPlaybackSegmentId = null;
      if (this.playbackAnimFrameId !== null) {
        cancelAnimationFrame(this.playbackAnimFrameId);
        this.playbackAnimFrameId = null;
      }
      this.playbackProgressCallback?.(seg.endTime);
    };

    this.startPlaybackProgressTracking();
  }

  stopPlayback(): void {
    if (this.playbackSource) {
      try {
        this.playbackSource.stop();
      } catch {
        // already stopped
      }
      this.playbackSource = null;
    }
    this.isPlaying = false;
    this.currentPlaybackSegmentId = null;
    if (this.playbackAnimFrameId !== null) {
      cancelAnimationFrame(this.playbackAnimFrameId);
      this.playbackAnimFrameId = null;
    }
  }

  updateSegmentNotes(segmentId: string, notes: string): void {
    const seg = this._segments.find((s) => s.id === segmentId);
    if (seg) {
      seg.notes = notes;
    }
  }

  getCurrentPlaybackTime(): number {
    if (!this.isPlaying || !this.audioContext) return 0;
    const elapsed = this.audioContext.currentTime - this.playbackStartTime;
    return this.playbackOffset + elapsed;
  }

  generateMarkdown(): string {
    const sorted = [...this._segments].sort((a, b) => a.startTime - b.startTime);
    let md = '# 会议纪要\n\n';
    for (const seg of sorted) {
      md += `${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}\n\n`;
      md += seg.notes ? `${seg.notes}\n\n` : '（未填写纪要）\n\n';
    }
    return md;
  }

  destroy(): void {
    this.stopRecording();
    this.stopPlayback();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private detectSilence(chunk: Float32Array): void {
    for (let i = 0; i < chunk.length; i++) {
      const absSample = Math.abs(chunk[i]);
      const absoluteSampleIndex = this.totalSampleCount - chunk.length + i;

      if (absSample < SILENCE_THRESHOLD) {
        if (this.silenceStartSample < 0) {
          this.silenceStartSample = absoluteSampleIndex;
        } else {
          const silenceDurationSamples = absoluteSampleIndex - this.silenceStartSample;
          if (silenceDurationSamples >= this.silenceSampleThreshold) {
            this.createSegmentFromSamples(
              this.currentSegmentStartSample,
              this.silenceStartSample,
            );
            this.currentSegmentStartSample = absoluteSampleIndex;
            this.silenceStartSample = -1;
          }
        }
      } else {
        this.silenceStartSample = -1;
      }
    }
  }

  private createSegmentFromSamples(startSample: number, endSample: number): void {
    if (endSample <= startSample) return;

    const durationSamples = endSample - startSample;
    if (durationSamples < SAMPLE_RATE * 0.2) return;

    const startTime = startSample / SAMPLE_RATE;
    const endTime = endSample / SAMPLE_RATE;

    const waveform = this.extractWaveformForSegment(startSample, endSample);

    const segment: Segment = {
      id: uuidv4(),
      startTime,
      endTime,
      waveformData: waveform,
      notes: '',
    };

    this._segments.push(segment);
    this.segmentsCallback?.([...this._segments]);
  }

  private extractWaveformForSegment(startSample: number, endSample: number): Float32Array {
    const samples: number[] = [];
    let currentPos = 0;

    for (const buffer of this.recordedBuffers) {
      const bufStart = currentPos;
      const bufEnd = currentPos + buffer.length;

      if (bufEnd <= startSample || bufStart >= endSample) {
        currentPos = bufEnd;
        continue;
      }

      const overlapStart = Math.max(startSample - bufStart, 0);
      const overlapEnd = Math.min(endSample - bufStart, buffer.length);

      for (let i = overlapStart; i < overlapEnd; i++) {
        samples.push(buffer[i]);
      }

      currentPos = bufEnd;
      if (currentPos >= endSample) break;
    }

    const data = new Float32Array(samples);
    return this.downsampleWaveform(data, WAVEFORM_DOWNSAMPLE_TARGET);
  }

  private finalizeLastSegment(): void {
    if (this.totalSampleCount > this.currentSegmentStartSample) {
      this.createSegmentFromSamples(this.currentSegmentStartSample, this.totalSampleCount);
    }
  }

  private downsampleWaveform(data: Float32Array, targetLength: number): Float32Array {
    if (data.length <= targetLength) {
      const result = new Float32Array(targetLength);
      const maxVal = Math.max(...Array.from(data).map((v) => Math.abs(v)), 0.01);
      for (let i = 0; i < data.length; i++) {
        result[i] = Math.abs(data[i]) / maxVal;
      }
      return result;
    }

    const result = new Float32Array(targetLength);
    const step = data.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * step);
      const end = Math.min(Math.floor((i + 1) * step), data.length);
      let max = 0;
      for (let j = start; j < end; j++) {
        const absVal = Math.abs(data[j]);
        if (absVal > max) max = absVal;
      }
      result[i] = max;
    }

    return result;
  }

  private buildFullAudioBuffer(): void {
    if (!this.audioContext || this.recordedBuffers.length === 0) return;

    const totalLength = this.recordedBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;

    for (const buf of this.recordedBuffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }

    this.audioBuffer = this.audioContext.createBuffer(1, totalLength, SAMPLE_RATE);
    this.audioBuffer.getChannelData(0).set(merged);
  }

  private startWaveformAnimation(): void {
    if (!this.analyserNode) return;

    const timeData = new Float32Array(this.analyserNode.frequencyBinCount);
    const freqData = new Uint8Array(this.analyserNode.frequencyBinCount);

    const animate = () => {
      if (!this._isRecording || !this.analyserNode) return;

      this.analyserNode.getFloatTimeDomainData(timeData);
      this.analyserNode.getByteFrequencyData(freqData);

      this.waveformCallback?.(timeData, freqData);

      this.animFrameId = requestAnimationFrame(animate);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  private startPlaybackProgressTracking(): void {
    const track = () => {
      if (!this.isPlaying) return;

      const currentTime = this.getCurrentPlaybackTime();
      this.playbackProgressCallback?.(currentTime);

      this.playbackAnimFrameId = requestAnimationFrame(track);
    };
    this.playbackAnimFrameId = requestAnimationFrame(track);
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
