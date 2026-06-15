import { Hands, Results, NormalizedLandmarkList } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import eventBus from './event-bus';
import { GestureType, GestureData, FingerTip } from './types';

const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];
const FINGER_PIP_INDICES = [2, 6, 10, 14, 18];
const FINGER_MCP_INDICES = [1, 5, 9, 13, 17];
const WRIST_INDEX = 0;

export class GestureCapture {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement;
  private isRunning: boolean = false;
  private lastGesture: GestureType = GestureType.NONE;
  private lastEmitTime: number = 0;
  private gestureStableFrames: number = 0;
  private currentStableGesture: GestureType = GestureType.NONE;
  private readonly EMIT_INTERVAL: number = 33;
  private readonly STABLE_FRAME_THRESHOLD: number = 3;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.hands && this.isRunning) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });

    await this.camera.start();
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
  }

  destroy(): void {
    this.stop();
  }

  private onResults(results: Results): void {
    const now = performance.now();
    if (now - this.lastEmitTime < this.EMIT_INTERVAL) return;
    this.lastEmitTime = now;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.emitGestureData([], GestureType.NONE, now);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const fingerTips = this.extractFingerTips(landmarks);
    const gestureType = this.detectGesture(landmarks);

    this.emitGestureData(fingerTips, gestureType, now);
  }

  private extractFingerTips(landmarks: NormalizedLandmarkList): FingerTip[] {
    return FINGER_TIP_INDICES.map((idx) => ({
      x: landmarks[idx].x,
      y: landmarks[idx].y,
      z: landmarks[idx].z
    }));
  }

  private detectGesture(landmarks: NormalizedLandmarkList): GestureType {
    const wrist = landmarks[WRIST_INDEX];
    const fingerStates: boolean[] = [];

    for (let i = 0; i < 5; i++) {
      const tipIdx = FINGER_TIP_INDICES[i];
      const pipIdx = FINGER_PIP_INDICES[i];
      const mcpIdx = FINGER_MCP_INDICES[i];

      if (i === 0) {
        const thumbTipToMcp = this.distance2D(landmarks[tipIdx], landmarks[FINGER_MCP_INDICES[1]]);
        const wristToMcp = this.distance2D(wrist, landmarks[FINGER_MCP_INDICES[1]]);
        fingerStates.push(thumbTipToMcp > wristToMcp * 0.7);
      } else {
        const tipToWrist = this.distance2D(landmarks[tipIdx], wrist);
        const mcpToWrist = this.distance2D(landmarks[mcpIdx], wrist);
        const pipToWrist = this.distance2D(landmarks[pipIdx], wrist);
        fingerStates.push(tipToWrist > Math.max(mcpToWrist, pipToWrist) * 1.1);
      }
    }

    const extendedCount = fingerStates.filter(Boolean).length;
    const [thumb, index, middle, ring, pinky] = fingerStates;

    let detectedGesture: GestureType = GestureType.NONE;

    if (extendedCount <= 1) {
      detectedGesture = GestureType.FIST;
    } else if (extendedCount >= 4) {
      detectedGesture = GestureType.OPEN;
    } else if (index && middle && !ring && !pinky) {
      const indexTip = landmarks[FINGER_TIP_INDICES[1]];
      const middleTip = landmarks[FINGER_TIP_INDICES[2]];
      const indexMcp = landmarks[FINGER_MCP_INDICES[1]];
      const middleMcp = landmarks[FINGER_MCP_INDICES[2]];
      const tipDistance = this.distance2D(indexTip, middleTip);
      const mcpDistance = this.distance2D(indexMcp, middleMcp);
      if (tipDistance < mcpDistance * 2.0) {
        detectedGesture = GestureType.VICTORY;
      }
    }

    if (detectedGesture === this.currentStableGesture) {
      this.gestureStableFrames++;
    } else {
      this.currentStableGesture = detectedGesture;
      this.gestureStableFrames = 1;
    }

    if (this.gestureStableFrames >= this.STABLE_FRAME_THRESHOLD) {
      this.lastGesture = detectedGesture;
      return detectedGesture;
    }

    return this.lastGesture;
  }

  private distance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private emitGestureData(fingerTips: FingerTip[], gestureType: GestureType, timestamp: number): void {
    const data: GestureData = {
      fingerTips,
      gestureType,
      timestamp
    };
    eventBus.emit('gestureData', data);
  }
}
