import { Hands, Results } from '@mediapipe/hands';

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export type GestureType = 'fist' | 'open' | 'point' | 'none';

export interface FrameData {
  landmarks: LandmarkPoint[];
  gesture: GestureType;
  indexFingerTip?: LandmarkPoint;
  timestamp: number;
}

export class HandDetector {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private onFrameCallback: ((data: FrameData) => void) | null = null;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private frameInterval: number = 100;

  constructor() {
    this.initHands();
  }

  private initHands() {
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.handleResults.bind(this));
  }

  public attachVideo(video: HTMLVideoElement) {
    this.videoElement = video;
  }

  public onFrame(callback: (data: FrameData) => void) {
    this.onFrameCallback = callback;
  }

  public async start() {
    if (this.isRunning || !this.videoElement) return;
    this.isRunning = true;
    this.processFrames();
  }

  public stop() {
    this.isRunning = false;
  }

  private async processFrames() {
    if (!this.isRunning || !this.videoElement || !this.hands) return;

    const now = performance.now();
    if (now - this.lastFrameTime >= this.frameInterval) {
      if (this.videoElement.readyState >= 2) {
        await this.hands.send({ image: this.videoElement });
      }
      this.lastFrameTime = now;
    }

    requestAnimationFrame(this.processFrames.bind(this));
  }

  private handleResults(results: Results) {
    const landmarks: LandmarkPoint[] = [];
    let gesture: GestureType = 'none';
    let indexFingerTip: LandmarkPoint | undefined;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const handLandmarks = results.multiHandLandmarks[0];
      for (let i = 0; i < handLandmarks.length; i++) {
        const pt = handLandmarks[i];
        landmarks.push({ x: pt.x, y: pt.y, z: pt.z });
      }
      indexFingerTip = landmarks[8];
      gesture = this.classifyGesture(landmarks);
    }

    if (this.onFrameCallback) {
      this.onFrameCallback({
        landmarks,
        gesture,
        indexFingerTip,
        timestamp: performance.now()
      });
    }
  }

  private classifyGesture(landmarks: LandmarkPoint[]): GestureType {
    const tips = [4, 8, 12, 16, 20];
    const pips = [3, 6, 10, 14, 18];

    let extendedFingers = 0;
    for (let i = 1; i < 5; i++) {
      if (landmarks[tips[i]].y < landmarks[pips[i]].y - 0.02) {
        extendedFingers++;
      }
    }

    const thumbExtended = Math.abs(landmarks[4].x - landmarks[2].x) > 0.06;
    if (thumbExtended) extendedFingers++;

    const indexExtended = landmarks[8].y < landmarks[6].y - 0.02;
    const middleExtended = landmarks[12].y < landmarks[10].y - 0.02;
    const ringExtended = landmarks[16].y < landmarks[14].y - 0.02;
    const pinkyExtended = landmarks[20].y < landmarks[18].y - 0.02;

    if (extendedFingers === 0) {
      return 'fist';
    }

    if (extendedFingers >= 4) {
      return 'open';
    }

    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'point';
    }

    return 'none';
  }

  public getConnections(): [number, number][] {
    return [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];
  }
}
