export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Sculpture {
  id: string;
  title: string;
  artist: string;
  description: string;
  materialType: string;
  modelUrl: string;
  geometryType: string;
  color: string;
  scale: number;
}

export interface CaptureRequest {
  sculptureId: string;
  position: Vec3;
  target: Vec3;
  zoom: number;
}

export interface CaptureResponse {
  id: string;
  imageBase64: string;
  clickCount: number;
}

export interface FeaturedSnapshot {
  id: string;
  sculptureId: string;
  sculptureTitle: string;
  position: Vec3;
  target: Vec3;
  zoom: number;
  imageBase64: string;
  thumbnailBase64: string;
  clickCount: number;
}

export interface CameraState {
  position: Vec3;
  target: Vec3;
  zoom: number;
}

export type Route = 'gallery' | 'featured';
