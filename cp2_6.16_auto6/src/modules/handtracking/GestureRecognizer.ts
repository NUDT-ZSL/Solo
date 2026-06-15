export interface GestureEvent {
  type: 'open_palm' | 'fist' | 'pointing' | 'pinch' | 'none';
  handIndex: number;
  palmPosition: { x: number; y: number };
  indexTipPosition?: { x: number; y: number };
  timestamp: number;
}

export type GestureCallback = (events: GestureEvent[]) => void;

interface FingerState {
  isExtended: boolean;
  tip: { x: number; y: number; z: number };
  pip: { x: number; y: number; z: number };
  mcp: { x: number; y: number; z: number };
}

export class GestureRecognizer {
  private callback: GestureCallback | null = null;
  private lastEvents: GestureEvent[] = [];
  private smoothingWindow: number = 3;
  private gestureHistory: { type: string; count: number }[][] = [];

  constructor() {}

  setCallback(callback: GestureCallback): void {
    this.callback = callback;
  }

  processLandmarks(multiHandLandmarks: any[] | null, timestamp: number): void {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
      if (this.lastEvents.length > 0 && this.callback) {
        this.lastEvents = [];
        this.callback([]);
      }
      return;
    }

    const events: GestureEvent[] = [];

    for (let i = 0; i < multiHandLandmarks.length; i++) {
      const landmarks = multiHandLandmarks[i];
      const gesture = this.recognizeGesture(landmarks, i, timestamp);
      events.push(gesture);
    }

    const smoothedEvents = this.smoothGestures(events);

    if (this.gesturesChanged(smoothedEvents, this.lastEvents) && this.callback) {
      this.lastEvents = smoothedEvents;
      this.callback(smoothedEvents);
    } else if (this.callback) {
      this.callback(smoothedEvents);
    }
  }

  private recognizeGesture(landmarks: any[], handIndex: number, timestamp: number): GestureEvent {
    const fingerStates = this.getFingerStates(landmarks);
    const palmPosition = this.getPalmPosition(landmarks);
    const indexTipPosition = {
      x: landmarks[8].x,
      y: landmarks[8].y,
    };

    let gestureType: GestureEvent['type'] = 'none';

    const extendedCount = fingerStates.filter(f => f.isExtended).length;
    const isPointing = this.isPointingGesture(fingerStates);
    const isPinch = this.isPinchGesture(landmarks);

    if (isPinch) {
      gestureType = 'pinch';
    } else if (isPointing) {
      gestureType = 'pointing';
    } else if (extendedCount >= 4) {
      gestureType = 'open_palm';
    } else if (extendedCount <= 1) {
      gestureType = 'fist';
    }

    return {
      type: gestureType,
      handIndex,
      palmPosition,
      indexTipPosition,
      timestamp,
    };
  }

  private getFingerStates(landmarks: any[]): FingerState[] {
    const fingerIndices = [
      { tip: 4, pip: 3, mcp: 2 },
      { tip: 8, pip: 6, mcp: 5 },
      { tip: 12, pip: 10, mcp: 9 },
      { tip: 16, pip: 14, mcp: 13 },
      { tip: 20, pip: 18, mcp: 17 },
    ];

    return fingerIndices.map(({ tip, pip, mcp }) => {
      const tipPoint = landmarks[tip];
      const pipPoint = landmarks[pip];
      const mcpPoint = landmarks[mcp];
      const wrist = landmarks[0];

      const tipToWrist = this.distance(tipPoint, wrist);
      const mcpToWrist = this.distance(mcpPoint, wrist);

      const isExtended = tipToWrist > mcpToWrist * 1.2;

      return {
        isExtended,
        tip: tipPoint,
        pip: pipPoint,
        mcp: mcpPoint,
      };
    });
  }

  private isPointingGesture(fingerStates: FingerState[]): boolean {
    if (fingerStates.length < 5) return false;

    const indexExtended = fingerStates[1].isExtended;
    const middleExtended = fingerStates[2].isExtended;
    const ringExtended = fingerStates[3].isExtended;
    const pinkyExtended = fingerStates[4].isExtended;

    return indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
  }

  private isPinchGesture(landmarks: any[]): boolean {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = this.distance(thumbTip, indexTip);

    const palmSize = this.distance(landmarks[0], landmarks[9]);

    return distance < palmSize * 0.3;
  }

  private getPalmPosition(landmarks: any[]): { x: number; y: number } {
    const palmLandmarks = [0, 5, 9, 13, 17];
    let x = 0;
    let y = 0;

    for (const idx of palmLandmarks) {
      x += landmarks[idx].x;
      y += landmarks[idx].y;
    }

    return {
      x: x / palmLandmarks.length,
      y: y / palmLandmarks.length,
    };
  }

  private distance(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private smoothGestures(currentEvents: GestureEvent[]): GestureEvent[] {
    this.gestureHistory.push(currentEvents.map(e => ({ type: e.type, count: 1 })));

    if (this.gestureHistory.length > this.smoothingWindow) {
      this.gestureHistory.shift();
    }

    if (this.gestureHistory.length < this.smoothingWindow) {
      return currentEvents;
    }

    return currentEvents.map((event, index) => {
      const typeCounts: Record<string, number> = {};

      for (const historyEntry of this.gestureHistory) {
        if (historyEntry[index]) {
          const type = historyEntry[index].type;
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        }
      }

      let mostCommonType = event.type;
      let maxCount = 0;

      for (const [type, count] of Object.entries(typeCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonType = type as GestureEvent['type'];
        }
      }

      return {
        ...event,
        type: mostCommonType as GestureEvent['type'],
      };
    });
  }

  private gesturesChanged(a: GestureEvent[], b: GestureEvent[]): boolean {
    if (a.length !== b.length) return true;

    for (let i = 0; i < a.length; i++) {
      if (a[i].type !== b[i].type) return true;
    }

    return false;
  }
}
