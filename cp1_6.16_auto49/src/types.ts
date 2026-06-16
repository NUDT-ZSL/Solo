export interface Flower {
  id: string;
  name: string;
  price: number;
  season: string;
  color: string;
}

export interface Occasion {
  id: string;
  name: string;
  recommendations: string[];
  discount: number;
  description: string;
}

export interface SelectedFlower extends Flower {
  quantity: number;
  layoutX: number;
  layoutY: number;
  rotation: number;
}

export interface BouquetLayout {
  flowers: SelectedFlower[];
  wrappingColor: string;
}

export interface PriceBreakdown {
  flowerTotal: number;
  wrappingFee: number;
  total: number;
}

export interface OrderData {
  flowers: { id: string; name: string; price: number; quantity: number }[];
  screenshot: string;
  totalPrice: number;
  message: string;
  wrappingColor: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export const WRAPPING_OPTIONS = [
  { name: '牛皮纸', color: '#8B4513', price: 5 },
  { name: '浅粉', color: '#FFB6C1', price: 5 },
  { name: '银灰', color: '#C0C0C0', price: 5 },
] as const;

export const FLOWER_COLORS: Record<string, { inner: string; outer: string }> = {
  red: { inner: '#FF6B6B', outer: '#C0392B' },
  pink: { inner: '#FFB6C1', outer: '#E91E90' },
  white: { inner: '#FFFFFF', outer: '#D0D0D0' },
  yellow: { inner: '#FFD700', outer: '#F39C12' },
  purple: { inner: '#D8BFD8', outer: '#8E44AD' },
  green: { inner: '#90EE90', outer: '#27AE60' },
};
