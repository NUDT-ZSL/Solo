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
type PlaybackEndCallback = () => void;

const SILENCE_THRESHOLD = 0.03;
const SILENCE_DURATION_MS = 1000;
const ANALYSER_FFT_SIZE = 1024;
const SAMPLE_RATE = 44100;
const WAVEFORM_DOWNSAMPLE_TARGET = 240;
const MIN_SEGMENT_DURATION = 0.2;

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private playbackGain: GainNode | null = null;

  private _isRecording = false;

  private recordedBuffers: Float32Array[] = [];
  private totalSampleCount = 0;

  private currentSegmentStartSample = 0;
  private silenceStartSample = -1;
  private silenceSampleThreshold: number;

  private _segments: Segment[] = [];

  private waveformCallback: WaveformCallback | null = null;
  private segmentsCallback: SegmentsCallback | null = null;
  private playbackProgressCallback: PlaybackProgressCallback | null = null;
  private playbackEndCallback: PlaybackEndCallback | null = null;

  private animFrameId: number | null = null;

  private audioBuffer: AudioBuffer | null = null;
  private playbackSource: AudioBufferSourceNode | null = null;
  private playbackStartTime = 0;
  private playbackOffset = 0;
  private playbackDuration = 0;
  private isPlaying = false;
  private playbackAnimFrameId: number | null = null;
  private currentPlaybackSegmentId: string | null = null;
  private playbackEndTimer: number | null = null;

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

  get hasAudioBuffer(): boolean {
    return this.audioBuffer !== null;
  }

  get totalDuration(): number {
    if (!this.audioBuffer) return 0;
    return this.audioBuffer.duration;
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

  onPlaybackEnd(cb: PlaybackEndCallback) {
    this.playbackEndCallback = cb;
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
      console.error('Microphone error:', err);
      throw new Error('无法获取麦克风权限，请检查浏览器设置');
    }

    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) {
      throw new Error('当前浏览器不支持 Web Audio API');
    }
    this.audioContext = new Ctx({ sampleRate: SAMPLE_RATE });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      await this.audioContext.audioWorklet.addModule('/recording-processor.js');
    } catch (err) {
      console.warn('AudioWorklet addModule failed, fallback:', err);
      // Fallback: create worklet node anyway, browser may have it cached
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = ANALYSER_FFT_SIZE;
    this.analyserNode.smoothingTimeConstant = 0.6;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    try {
      this.workletNode = new AudioWorkletNode(this.audioContext, 'recording-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
      });

      this.workletNode.port.onmessage = (event) => {
        if (!this._isRecording) return;
        if (event.data && event.data.type === 'chunk') {
          const samples = new Float32Array(event.data.samples);
          this.recordedBuffers.push(samples);
          this.totalSampleCount += samples.length;
          this.detectSilence(samples);
        }
      };

      this.workletNode.onprocessorerror = (err) => {
        console.error('AudioWorklet processor error:', err);
      };

      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.gainNode);
      this.gainNode.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('AudioWorkletNode init failed, trying ScriptProcessorNode fallback:', err);
      await this.fallbackInitLegacyScriptProcessor();
    }

    this._isRecording = true;
    this.recordedBuffers = [];
    this.totalSampleCount = 0;
    this.currentSegmentStartSample = 0;
    this.silenceStartSample = -1;
    this._segments = [];

    this.startWaveformAnimation();
    this.segmentsCallback?.(this._segments);
  }

  private async fallbackInitLegacyScriptProcessor(): Promise<void> {
    if (!this.audioContext || !this.sourceNode || !this.analyserNode || !this.gainNode) return;

    const bufferSize = 4096;
    const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    (scriptProcessor as any)._isLegacy = true;

    scriptProcessor.onaudioprocess = (event) => {
      if (!this._isRecording) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(inputData);
      this.recordedBuffers.push(copy);
      this.totalSampleCount += copy.length;
      this.detectSilence(copy);
    };

    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(scriptProcessor);
    scriptProcessor.connect(this.audioContext.destination);

    this.workletNode = scriptProcessor as unknown as AudioWorkletNode;
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

    try {
      if (this.workletNode) {
        if ('port' in this.workletNode && this.workletNode.port) {
          (this.workletNode.port as any).onmessage = null;
        }
        if ('onaudioprocess' in (this.workletNode as any)) {
          (this.workletNode as any).onaudioprocess = null;
        }
        try { this.workletNode.disconnect(); } catch { /* ignore */ }
        this.workletNode = null;
      }
    } catch (e) { /* ignore */ }

    try {
      if (this.gainNode) { this.gainNode.disconnect(); this.gainNode = null; }
      if (this.analyserNode) { this.analyserNode.disconnect(); this.analyserNode = null; }
      if (this.sourceNode) { this.sourceNode.disconnect(); this.sourceNode = null; }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }
    } catch (e) { /* ignore */ }

    this.segmentsCallback?.([...this._segments]);
  }

  playSegment(segmentId: string): void {
    const seg = this._segments.find((s) => s.id === segmentId);
    if (!seg) return;
    this.seekAndPlay(seg.startTime, seg.endTime - seg.startTime, segmentId);
  }

  seekToPosition(seconds: number): void {
    if (!this.audioBuffer || !this.audioContext) return;
    const clampedTime = Math.max(0, Math.min(seconds, this.audioBuffer.duration));
    const remaining = this.audioBuffer.duration - clampedTime;
    let activeSegmentId = this.currentPlaybackSegmentId;
    for (const seg of this._segments) {
      if (clampedTime >= seg.startTime && clampedTime < seg.endTime) {
        activeSegmentId = seg.id;
        break;
      }
    }
    this.seekAndPlay(clampedTime, remaining, activeSegmentId);
  }

  private seekAndPlay(offset: number, duration: number, segmentId: string | null): void {
    if (!this.audioContext || !this.audioBuffer) return;

    this.stopPlayback();

    this.playbackSource = this.audioContext.createBufferSource();
    this.playbackSource.buffer = this.audioBuffer;

    this.playbackGain = this.audioContext.createGain();
    this.playbackGain.gain.value = 1.0;
    this.playbackSource.connect(this.playbackGain);
    this.playbackGain.connect(this.audioContext.destination);

    const finalDuration = Math.min(duration, this.audioBuffer.duration - offset);
    this.playbackOffset = offset;
    this.playbackDuration = finalDuration;
    this.playbackStartTime = this.audioContext.currentTime;
    this.currentPlaybackSegmentId = segmentId;
    this.isPlaying = true;

    this.playbackSource.onended = () => {
      const wasPlaying = this.isPlaying;
      this.cleanupPlaybackState();
      if (wasPlaying) {
        this.playbackProgressCallback?.(this.playbackOffset + this.playbackDuration);
        this.playbackEndCallback?.();
      }
    };

    try {
      this.playbackSource.start(0, offset, finalDuration);
    } catch (err) {
      console.error('playback start failed:', err);
      this.cleanupPlaybackState();
      return;
    }

    this.startPlaybackProgressTracking();

    if (this.playbackEndTimer !== null) {
      window.clearTimeout(this.playbackEndTimer);
    }
    this.playbackEndTimer = window.setTimeout(() => {
      this.playbackEndTimer = null;
    }, finalDuration * 1000 + 100);
  }

  stopPlayback(): void {
    if (this.playbackEndTimer !== null) {
      window.clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = null;
    }
    if (this.playbackSource) {
      try { this.playbackSource.stop(); } catch { /* already stopped */ }
    }
    this.cleanupPlaybackState();
  }

  private cleanupPlaybackState(): void {
    try {
      if (this.playbackSource) { this.playbackSource.disconnect(); }
      if (this.playbackGain) { this.playbackGain.disconnect(); }
    } catch { /* ignore */ }
    this.playbackSource = null;
    this.playbackGain = null;
    this.isPlaying = false;
    if (this.playbackAnimFrameId !== null) {
      cancelAnimationFrame(this.playbackAnimFrameId);
      this.playbackAnimFrameId = null;
    }
  }

  updateSegmentNotes(segmentId: string, notes: string): void {
    const seg = this._segments.find((s) => s.id === segmentId);
    if (seg) seg.notes = notes;
  }

  getCurrentPlaybackTime(): number {
    if (!this.isPlaying || !this.audioContext) return 0;
    const elapsed = this.audioContext.currentTime - this.playbackStartTime;
    return Math.min(this.playbackOffset + elapsed, this.playbackOffset + this.playbackDuration);
  }

  findSegmentAtTime(time: number): Segment | null {
    for (const seg of this._segments) {
      if (time >= seg.startTime && time < seg.endTime) return seg;
    }
    return null;
  }

  generateMarkdown(): string {
    const sorted = [...this._segments].sort((a, b) => a.startTime - b.startTime);
    let md = '# 会议纪要\n\n';
    md += `> 自动生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `> 总分段数：${sorted.length}\n\n`;
    md += '---\n\n';
    for (const seg of sorted) {
      const timeStr = `${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`;
      const duration = (seg.endTime - seg.startTime).toFixed(1);
      md += `## ${timeStr}（时长：${duration}秒）\n\n`;
      if (seg.notes && seg.notes.trim().length > 0) {
        md += `${seg.notes.trim()}\n\n`;
      } else {
        md += `_（该分段未填写纪要）_\n\n`;
      }
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
            this.createSegmentFromSamples(this.currentSegmentStartSample, this.silenceStartSample);
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
    if (durationSamples < SAMPLE_RATE * MIN_SEGMENT_DURATION) return;

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
    if (data.length === 0) return new Float32Array(targetLength);
    if (data.length <= targetLength) {
      const result = new Float32Array(targetLength);
      const maxVal = Math.max(...Array.from(data).map((v) => Math.abs(v)), 0.01);
      const ratio = data.length / targetLength;
      for (let i = 0; i < targetLength; i++) {
        const idx = Math.min(Math.floor(i * ratio), data.length - 1);
        result[i] = Math.abs(data[idx]) / maxVal;
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
