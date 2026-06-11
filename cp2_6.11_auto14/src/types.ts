// ============================================================
// 全局类型定义文件
// 数据流向：被所有模块引用，定义统一的数据结构接口
// ============================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type GeometryType = 'cube' | 'sphere' | 'cone' | 'cylinder' | 'torus';
export type MaterialType = 'metal' | 'glass' | 'matte';

export interface GeometryPart {
  type: GeometryType;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: string;
  material: MaterialType;
}

export interface ExhibitData {
  id: string;
  templateId: string;
  name: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  parts: GeometryPart[];
  isRotating: boolean;
  rotationSpeed: number;
  selected: boolean;
}

export interface Camera {
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
  yaw: number;
  pitch: number;
  distance: number;
}

export interface Light {
  position: Vec3;
  color: string;
  intensity: number;
  type: 'point' | 'spot' | 'ambient';
}

export interface ExhibitTemplate {
  id: string;
  name: string;
  description: string;
  parts: GeometryPart[];
}

export interface LayoutData {
  version: string;
  timestamp: number;
  camera: {
    yaw: number;
    pitch: number;
    fov: number;
    distance: number;
  };
  exhibits: ExhibitData[];
}

export interface HighlightAnimationState {
  startTime: number;
  period: number;
  colorStart: string;
  colorEnd: string;
}
