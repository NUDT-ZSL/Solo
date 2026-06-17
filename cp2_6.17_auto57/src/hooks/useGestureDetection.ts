import { useRef, useState, useCallback, useEffect } from 'react';

export type GestureType = 'none' | 'pinch' | 'spread' | 'point' | 'open' | 'fist';

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

function distance2D(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function detectGesture(landmarks: HandLandmark[], allHandsLandmarks: HandLandmark[][]): GestureType {
  const thumb = landmarks[4];
  const index = landmarks[8];
  const middle = landmarks[12];
  const ring = landmarks[16];
  const pinky = landmarks[20];
  const wrist = landmarks[0];

  const pinchDist = distance2D(thumb, index);

  if (pinchDist < 0.04) {
    if (allHandsLandmarks.length >= 2) {
      const otherHand = allHandsLandmarks.find((h) => h !== landmarks);
      if (otherHand) {
        const otherThumb = otherHand[4];
        const otherIndex = otherHand[8];
        const otherPinchDist = distance2D(otherThumb, otherIndex);
        if (otherPinchDist < 0.04) {
          const crossDist = distance2D(thumb, otherThumb);
          if (crossDist > 0.08) {
            return 'spread';
          }
        }
      }
    }
    return 'pinch';
  }

  const indexExtended = distance2D(index, wrist) > distance2D(landmarks[5], wrist) * 1.1;
  const middleExtended = distance2D(middle, wrist) > distance2D(landmarks[9], wrist) * 1.1;
  const ringExtended = distance2D(ring, wrist) > distance2D(landmarks[13], wrist) * 1.1;
  const pinkyExtended = distance2D(pinky, wrist) > distance2D(landmarks[17], wrist) * 1.1;

  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'point';
  }

  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return 'open';
  }

  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'fist';
  }

  return 'none';
}

export function useGestureDetection(videoRef: React.RefObject<HTMLVideoElement>) {
  const [gestureType, setGestureType] = useState<GestureType>('none');
  const [palmCenter, setPalmCenter] = useState<[number, number] | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastGestureRef = useRef<GestureType>('none');
  const gestureDebounceRef = useRef<number>(0);

  const onResults = useCallback((results: any) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setGestureType('none');
      setPalmCenter(null);
      return;
    }

    const allHands = results.multiHandLandmarks as HandLandmark[][];
    const landmarks = allHands[0];

    const palmX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
    const palmY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;

    const now = Date.now();
    const gesture = detectGesture(landmarks, allHands);

    if (gesture !== lastGestureRef.current || now - gestureDebounceRef.current > 150) {
      lastGestureRef.current = gesture;
      gestureDebounceRef.current = now;
      setGestureType(gesture);
    }

    setPalmCenter([1 - palmX, palmY]);
  }, []);

  const startDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
        cameraRef.current = camera;
      }

      setIsDetecting(true);
    } catch (err) {
      console.error('Failed to start gesture detection:', err);
    }
  }, [videoRef, onResults]);

  const stopDetection = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsDetecting(false);
    setGestureType('none');
    setPalmCenter(null);
  }, [videoRef]);

  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  return {
    gestureType,
    palmCenter,
    isDetecting,
    startDetection,
    stopDetection,
  };
}
