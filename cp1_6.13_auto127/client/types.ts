export interface Photo {
  id: string;
  title: string;
  originalName: string;
  filename: string;
  width: number;
  height: number;
  aspectRatio: number;
  tags: string[];
  captureDate: string;
  uploadDate: string;
  fileSize: number;
  mimeType: string;
  thumbnails: {
    w200: string;
    w600: string;
    w1200: string;
  };
}

export interface Tag {
  name: string;
  count: number;
  createdAt: string;
}

export interface PhotoListResponse {
  photos: Photo[];
  total: number;
  hasMore: boolean;
}

export interface UploadProgress {
  percent: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
