export interface ShopInfo {
  id: string;
  name: string;
  category: '餐饮' | '零售' | '娱乐' | '服务';
  floor: number;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  discount?: string;
}

export interface FloorInfo {
  level: number;
  shops: ShopInfo[];
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}
