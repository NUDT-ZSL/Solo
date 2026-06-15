export interface VeinNode {
  x: number;
  y: number;
}

export interface VeinData {
  id: string;
  imageId: string;
  nodes: VeinNode[];
  edges: [number, number][];
  width: number;
  height: number;
  createdAt: string;
}

export interface Tag {
  id: string;
  veinDataId: string;
  nodeIndex: number;
  x: number;
  y: number;
  note: string;
  date: string;
  plantName: string;
  createdAt: string;
}

export interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  plantName: string;
  path: string;
  thumbPath: string;
  width: number;
  height: number;
  veinDataId: string;
  createdAt: string;
}

export interface UploadResponse {
  imageId: string;
  veinDataId: string;
  veinData: VeinData;
  image: UploadedImage;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ImageDetail extends UploadedImage {
  veinData: VeinData;
  tags: Tag[];
}

export type ViewMode = 'canvas' | 'gallery';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  message: string;
  duration?: number;
}

export interface PendingTag {
  nodeIndex: number;
  x: number;
  y: number;
}
