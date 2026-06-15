export interface Comment {
  id: string;
  avatar: string;
  nickname: string;
  time: string;
  content: string;
}

export interface Work {
  id: string;
  name: string;
  category: '茶器' | '花器' | '食器' | '装饰品';
  thumbnail: string;
  image: string;
  description: string;
  videoUrl: string;
  comments: Comment[];
}

export type Category = '全部' | '茶器' | '花器' | '食器' | '装饰品';

export const CATEGORIES: Category[] = ['全部', '茶器', '花器', '食器', '装饰品'];
