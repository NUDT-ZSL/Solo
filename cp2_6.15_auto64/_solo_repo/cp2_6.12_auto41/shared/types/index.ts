export interface Material {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
  favorited: boolean;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  material_count: number;
}

export interface BoardMaterial {
  id: string;
  board_id: string;
  material_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  material: Material;
}
