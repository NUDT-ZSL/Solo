export interface ClothingItem {
  id: string;
  name: string;
  imageUrl: string;
  style: string;
  color: string;
  colorName: string;
  season: string[];
  occasion: string[];
  category: 'top' | 'bottom' | 'outer' | 'dress' | 'accessory';
}

export interface RecommendResult {
  id: string;
  items: ClothingItem[];
  matchScore: number;
  description: string;
  styleNote: string;
}

export interface FavoriteItem {
  id: string;
  recommendId: string;
  items: ClothingItem[];
  description: string;
  createdAt: number;
}

export type PageType = 'home' | 'detail' | 'recommend';
