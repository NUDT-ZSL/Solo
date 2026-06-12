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
  createdAt: number;
}

export interface Review {
  id: string;
  furnitureId: string;
  userId: string;
  userName: string;
  avatar: string;
  rating: number;
  content: string;
  createdAt: number;
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
  read: 0 | 1;
  createdAt: number;
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

export interface ExchangeRequestsResponse {
  received: ExchangeRequest[];
  sent: ExchangeRequest[];
}

export const STATUS_MAP: Record<FurnitureStatus, string> = {
  idle: '闲置中',
  reserved: '已预约',
  exchanged: '已交换',
};

export const STATUS_COLOR: Record<FurnitureStatus, { bg: string; text: string }> = {
  idle: { bg: '#d1fae5', text: '#065f46' },
  reserved: { bg: '#fed7aa', text: '#9a3412' },
  exchanged: { bg: '#e5e7eb', text: '#374151' },
};
