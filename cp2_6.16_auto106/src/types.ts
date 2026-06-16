export interface FlavorRating {
  spicy: number;
  sweet: number;
  salty: number;
  sour: number;
  umami: number;
}

export interface DishRecord {
  id: string;
  name: string;
  ingredients: string[];
  textureTags: string[];
  rating: number;
  note: string;
  flavor: FlavorRating;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  createdAt: string;
}

export const TEXTURE_TAGS = ['脆爽', '绵密', '多汁', '酥脆', '弹牙', '软糯'] as const;
export type TextureTag = typeof TEXTURE_TAGS[number];

export const FLAVOR_AXES: (keyof FlavorRating)[] = ['spicy', 'sweet', 'salty', 'sour', 'umami'];
export const FLAVOR_LABELS: Record<keyof FlavorRating, string> = {
  spicy: '辣度',
  sweet: '甜度',
  salty: '咸度',
  sour: '酸度',
  umami: '鲜度',
};
