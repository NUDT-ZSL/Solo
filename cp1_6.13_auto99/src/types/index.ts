export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  isbn: string;
  publishDate: string;
  pages: number;
  stock: number;
  cover: string;
  description: string;
  authorIntro: string;
}

export interface CartItem {
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  quantity: number;
}

export interface ShareItem {
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  quantity: number;
}

export interface ShareData {
  id: string;
  name: string;
  userId: string;
  items: ShareItem[];
  totalPrice: number;
  createdAt: string;
}

export type Category = '全部' | '科幻' | '文学' | '历史';
