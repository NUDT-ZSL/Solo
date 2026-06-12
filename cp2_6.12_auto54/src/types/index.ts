export type Category = '首饰' | '陶艺' | '布艺' | '木工' | '插画';

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  items: SaleItem[];
  total: number;
  timestamp: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  '首饰': '#FFB5B5',
  '陶艺': '#B5D8A3',
  '布艺': '#B5C8FF',
  '木工': '#D8B5A3',
  '插画': '#E5B5FF',
};

export const CATEGORIES: Category[] = ['首饰', '陶艺', '布艺', '木工', '插画'];
