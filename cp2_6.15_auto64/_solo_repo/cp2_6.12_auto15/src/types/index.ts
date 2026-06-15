export interface Trail {
  id: string;
  title: string;
  description: string;
  userId: string;
  geojson: string;
  thumbnailUrl: string;
  createdAt: string;
  favoriteCount?: number;
}

export interface Photo {
  id: string;
  trailId: string;
  imagePath: string;
  createdAt: string;
}

export interface TrailDetail {
  trail: Trail;
  photos: Photo[];
  isFavorited: boolean;
  favoriteCount: number;
}

export type DrawingMode = 'none' | 'polyline' | 'polygon';

export type SortOption = 'createdAt' | 'favoriteCount' | 'distance';

export type SortOrder = 'asc' | 'desc';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  exiting?: boolean;
}
