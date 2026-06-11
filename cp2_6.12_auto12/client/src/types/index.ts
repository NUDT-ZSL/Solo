export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  contact: string;
  status: 'available' | 'exchanged';
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Exchange {
  id: string;
  itemId: string;
  itemTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export const CATEGORIES = [
  '全部',
  '家具',
  '电子产品',
  '书籍',
  '衣物',
  '厨具',
  '运动器材',
  '其他'
] as const;

export type Category = typeof CATEGORIES[number];
