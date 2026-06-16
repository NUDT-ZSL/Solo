export interface Material {
  id: string;
  name: string;
  unit: string;
  color: string;
  quantity: number;
  supplier: string;
  price: number;
}

export type ProductType = 'bracelet' | 'necklace' | 'earring';

export interface PatternMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
}

export interface Pattern {
  id: string;
  name: string;
  productType: ProductType;
  imageUrl: string;
  steps: string;
  materials: PatternMaterial[];
}

export interface ProduceResult {
  success: boolean;
  missingMaterials: string[];
  totalCost: number;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  bracelet: '手链',
  necklace: '项链',
  earring: '耳环',
};

export const PRODUCT_TYPE_COLORS: Record<ProductType, string> = {
  bracelet: '#3498DB',
  necklace: '#2ECC71',
  earring: '#9B59B6',
};
