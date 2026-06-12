export type FurnitureCategory = 'sofa' | 'table' | 'chair' | 'cabinet' | 'bed';
export type FurnitureStatus = 'idle' | 'reserved' | 'exchanged';

export interface Furniture {
  id: string;
  name: string;
  category: FurnitureCategory;
  size: string;
  years: number;
  city: string;
  timeRange: string;
  images: string[];
  status: FurnitureStatus;
  userId: string;
  createdAt: string;
}

export interface Review {
  id: string;
  furnitureId: string;
  userId: string;
  userName: string;
  avatar: string;
  rating: number;
  content: string;
  createdAt: string;
}

export type ExchangeRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ExchangeRequest {
  id: string;
  furnitureId: string;
  furnitureName: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  toUserName: string;
  contact: string;
  email: string;
  phone: string;
  expectedTime: string;
  status: ExchangeRequestStatus;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  phone?: string;
  email?: string;
}

export const CATEGORY_MAP: Record<FurnitureCategory, string> = {
  sofa: '沙发',
  table: '桌子',
  chair: '椅子',
  cabinet: '柜子',
  bed: '床',
};

export const STATUS_MAP: Record<FurnitureStatus, string> = {
  idle: '闲置中',
  reserved: '已预约',
  exchanged: '已交换',
};
