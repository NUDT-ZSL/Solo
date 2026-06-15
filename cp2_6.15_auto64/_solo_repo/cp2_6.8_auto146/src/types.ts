export type PromoType = 'discount' | 'threshold' | 'bundle';

export interface Product {
  id: number;
  name: string;
  icon: string;
  originalPrice: number;
  stock: number;
  baseSales: number;
  discountPrice: number;
  estimatedSalesLift: number;
  inventoryConsumptionRate: number;
  salesBefore: number;
  salesAfter: number;
  isBundleEligible: boolean;
}

export interface SimulationResult {
  products: Product[];
  totalSalesBefore: number;
  totalSalesAfter: number;
  conversionRateLift: number;
  inventoryTurnoverDays: number;
  thresholdDiscounts?: ThresholdDiscount[];
  bundleInfo?: BundleInfo;
}

export interface ThresholdDiscount {
  threshold: number;
  discount: number;
}

export interface BundleInfo {
  productId1: number;
  productId2: number;
  bundlePrice: number;
  originalTotal: number;
}

export interface PromotionRules {
  promoType: PromoType;
  discountRate: number;
  thresholdDiscounts: ThresholdDiscount[];
  selectedThresholdIndex: number;
  bundleProductId1: number;
  bundleProductId2: number;
}

export interface SalesComparison {
  name: string;
  before: number;
  after: number;
}
