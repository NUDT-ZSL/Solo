export type ItemStatus = "在售" | "已售出" | "交易中";

export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  status: ItemStatus;
  sellerId: string;
  createdAt: string;
  soldAt?: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImageUrl: string;
  buyerId: string;
  sellerId: string;
  price: number;
  status: ItemStatus;
  createdAt: string;
}

export const CATEGORIES = ["全部", "电子产品", "书籍", "服饰", "家居", "运动", "其他"] as const;
export type Category = (typeof CATEGORIES)[number];
