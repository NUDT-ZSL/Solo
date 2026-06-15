import { Hands, Results } from '@mediapipe/hands';

export interface HandTrackingResult {
  landmarks: any[] | null;
  handCount: number;
  timestamp: number;
}

export type HandTrackingCallback = (result: HandTrackingResult) => void;

export class HandTracker {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isRunning: boolean = false;
  private callback: HandTrackingCallback | null = null;
  private lastTimestamp: number = 0;
  private minInterval: number = 33;

  constructor() {
    this.hands = null;
  }

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults(this.onResults.bind(this));

    await this.startCamera();
  }

  private async startCamera(): Promise<void> {
    if (!this.videoElement) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user',
        },
      });

      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      this.isRunning = true;
      this.processFrame();
    } catch (error) {
      console.error('Camera access denied or error:', error);
      throw error;
    }
  }

  private async processFrame(): Promise<void> {
    if (!this.isRunning || !this.hands || !this.videoElement) return;

    const now = performance.now();
    if (now - this.lastTimestamp >= this.minInterval) {
      this.lastTimestamp = now;
      try {
        await this.hands.send({ image: this.videoElement });
      } catch (e) {
        console.error('Hand tracking error:', e);
      }
    }

    requestAnimationFrame(() => this.processFrame());
  }

  private onResults(results: Results): void {
    const landmarks = results.multiHandLandmarks && results.multiHandLandmarks.length > 0
      ? results.multiHandLandmarks
      : null;

    const handCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

    if (this.callback) {
      this.callback({
        landmarks,
        handCount,
        timestamp: performance.now(),
      });
    }
  }

  setCallback(callback: HandTrackingCallback): void {
    this.callback = callback;
  }

  stop(): void {
    this.isRunning = false;
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }
}
