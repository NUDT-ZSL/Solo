export interface Photo {
  _id?: string;
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
}

export interface Tag {
  _id?: string;
  name: string;
  count: number;
  createdAt: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoWithThumbnails extends Photo {
  thumbnails: {
    w200: string;
    w600: string;
    w1200: string;
  };
}
