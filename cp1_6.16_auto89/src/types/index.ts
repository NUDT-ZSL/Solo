export type CraftType = 'material' | 'technique' | 'tool';

export type MaterialCategory = 'ceramic' | 'wood' | 'embroidery' | 'metal' | 'all';

export interface Anchor {
  id: string;
  x: number;
  y: number;
  type: CraftType;
  description: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  image: string;
  thumbnail: string;
  category: MaterialCategory;
  description: string;
  averageRating: number;
  reviewCount: number;
  views: number;
  createdAt: string;
}

export interface WorkDetail extends Work {
  anchors: Anchor[];
  reviews: Review[];
}
