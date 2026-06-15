export class AnimationRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private _isRecording = false;

  start(canvas: HTMLCanvasElement): boolean {
    try {
      this.chunks = [];
      this.stream = canvas.captureStream(60);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this._isRecording = true;
      return true;
    } catch {
      this._isRecording = false;
      return false;
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this._isRecording = false;
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this._isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  async download(): Promise<void> {
    const blob = await this.stop();
    if (blob.size === 0) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `影子戏法_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  isRecording(): boolean {
    return this._isRecording;
  }
}
