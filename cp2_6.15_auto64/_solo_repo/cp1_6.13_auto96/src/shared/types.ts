export interface Asset {
  _id: string;
  name: string;
  description: string;
  category: 'model' | 'texture' | 'sound';
  tags: string[];
  price: number;
  modelUrl: string;
  thumbnailUrl: string;
  author: string;
  authorId: string;
  favorites: number;
  isFavorited?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAssetDto {
  name: string;
  description: string;
  category: 'model' | 'texture' | 'sound';
  tags: string[];
  price: number;
  modelUrl: string;
  thumbnailUrl: string;
  author: string;
}

export interface UpdateAssetDto {
  name?: string;
  description?: string;
  category?: 'model' | 'texture' | 'sound';
  tags?: string[];
  price?: number;
}

export interface FavoriteResponse {
  success: boolean;
  favorites: number;
  isFavorited: boolean;
}

export interface AssetListResponse {
  data: Asset[];
  total: number;
}

export const CATEGORIES = [
  { value: 'model', label: '3D模型' },
  { value: 'texture', label: '纹理材质' },
  { value: 'sound', label: '音效音乐' },
] as const;

export const PRESET_TAGS = [
  'character', 'environment', 'prop', 'weapon', 'vehicle',
  'fantasy', 'sci-fi', 'medieval', 'modern', 'cartoon',
  'realistic', 'stylized', 'low-poly', 'high-poly', 'PBR',
  'animated', 'rigged', 'blender', 'unity', 'unreal',
  'architecture', 'nature', 'building', 'furniture', 'decoration',
  'effect', 'particle', 'ui', 'icon', 'material',
  'shader', 'texture', 'material', 'ai-generated',
  'hand-painted', 'photorealistic', 'retro', 'pixel-art',
  'voxel', 'isometric', 'top-down', 'first-person',
  'horror', 'rpg', 'fps', 'strategy', 'puzzle',
  'platformer', 'arcade', 'casual', 'indie', 'aaa'
] as const;
