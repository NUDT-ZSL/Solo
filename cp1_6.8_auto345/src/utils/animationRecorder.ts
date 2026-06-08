export class AnimationRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private _isRecording = false;

  get isRecording(): boolean {
    return this._isRecording;
  }

  start(canvas: HTMLCanvasElement): boolean {
    try {
      this.stream = canvas.captureStream(60);
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];

      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      if (!selectedMime) {
        console.warn('No supported WebM mime type found');
        return false;
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 5000000,
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this._isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      return false;
    }
  }

  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this._isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        this._isRecording = false;
        if (this.chunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop());
        this.stream = null;
      }
    });
  }

  async stopAndDownload(filename = 'shadow-puppet-show.webm'): Promise<void> {
    const blob = await this.stop();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
