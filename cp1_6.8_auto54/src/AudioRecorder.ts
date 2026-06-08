export interface RecordingResult {
  blob: Blob;
  duration: number;
  audioUrl: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private stream: MediaStream | null = null;
  private maxDuration: number = 10000;

  async start(maxDuration: number = 10000): Promise<void> {
    this.maxDuration = maxDuration;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.getSupportedMimeType(),
    });
    this.chunks = [];
    this.startTime = Date.now();

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);

    setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.stop();
      }
    }, maxDuration);
  }

  stop(): Promise<RecordingResult> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error('No recording in progress');
      }

      const duration = Date.now() - this.startTime;

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.chunks[0]?.type || 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);

        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
        }

        resolve({ blob, duration, audioUrl });
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  getElapsed(): number {
    if (!this.isRecording()) return 0;
    return Date.now() - this.startTime;
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  }
}
