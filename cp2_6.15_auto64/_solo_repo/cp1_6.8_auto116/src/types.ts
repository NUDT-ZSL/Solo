export interface Artwork {
  id: string;
  title: string;
  tags: string[];
  image_url: string;
  upload_time: string;
  likes: string[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface UploadRequest {
  title: string;
  tags: string[];
  image_base64: string;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface ArtworkListResponse {
  artworks: Artwork[];
  total: number;
  page: number;
  page_size: number;
}

export interface LikeResponse {
  likes: number;
  liked: boolean;
}

export const STYLE_TAGS = [
  "印象派",
  "抽象",
  "水彩",
  "油画",
  "素描",
  "写实",
  "超现实",
  "极简",
  "波普",
  "当代",
  "古典",
  "风景",
  "人物",
  "静物",
] as const;

export type StyleTag = (typeof STYLE_TAGS)[number];
