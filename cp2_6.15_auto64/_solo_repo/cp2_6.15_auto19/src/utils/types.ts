export interface PointData {
  position: Float32Array;
  color: Float32Array;
  originalIndices?: Uint32Array;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    radius: number;
  };
  totalPoints: number;
  lodLevel: number;
}

export interface Marker {
  id: string;
  pointIndex: number;
  position: [number, number, number];
  color: [number, number, number];
  timestamp: number;
}

export interface HighlightedPoint {
  index: number;
  position: [number, number, number];
  screenPosition: { x: number; y: number };
  startTime: number;
}

export type WorkerMessageType = 'parse' | 'progress' | 'complete' | 'error';

export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: {
    progress?: number;
    pointData?: PointData;
    error?: string;
    thumbnail?: ImageData;
  };
}

export interface UploadFileInfo {
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}
