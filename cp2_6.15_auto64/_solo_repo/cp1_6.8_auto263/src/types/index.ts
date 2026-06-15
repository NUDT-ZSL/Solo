export interface Taste {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  spicy: number;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface FlavorProfile {
  id: string;
  foodName: string;
  description: string;
  imageUrl: string;
  taste: Taste;
  smell: string;
  mood: string;
  moodType: 'happy' | 'relaxed' | 'excited' | 'nostalgic' | 'neutral';
  likes: number;
  liked: boolean;
  saved: boolean;
  author: Author;
  tags: string[];
  createdAt: string;
  comments: Comment[];
}

export interface SimilarFood {
  id: string;
  foodName: string;
  imageUrl: string;
  similarity: number;
}

export interface NetworkNode {
  id: string;
  foodName: string;
  size: number;
  color: string;
  x: number;
  y: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}
