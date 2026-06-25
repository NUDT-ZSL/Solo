export type Category = '二手书籍' | '手工艺品' | '家居用品' | '电子设备' | '服饰配饰' | '其他';

export interface Stall {
  id: number;
  booked: boolean;
  category?: Category;
  description?: string;
  contact?: string;
  userId?: string;
  userName?: string;
}

export interface Feedback {
  id: string;
  marketId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Market {
  id: string;
  name: string;
  date: string;
  deadline: string;
  totalStalls: number;
  stalls: Stall[];
  feedbacks: Feedback[];
}

export interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  message: string;
}