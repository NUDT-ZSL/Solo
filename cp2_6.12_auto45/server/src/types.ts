export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: number;
}

export interface Photo {
  id: string;
  filename: string;
  url: string;
  score: number;
  faceBox?: FaceBox;
  width: number;
  height: number;
  comments: Comment[];
  uploadedAt: number;
}
