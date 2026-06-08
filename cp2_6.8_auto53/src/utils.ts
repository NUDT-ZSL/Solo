export interface Product {
  id: string;
  name: string;
  originalPrice: number;
  cost: number;
  stock: number;
}

export type PromotionType = 'none' | 'fullReduction' | 'discount' | 'bundle';

export interface PromotionConfig {
  type: PromotionType;
  fullReduction?: { threshold: number; discount: number };
  discount?: { rate: number };
  bundle?: { addOnProductId: string; addOnPrice: number };
}

export interface ProductPromotion {
  productId: string;
  promotion: PromotionConfig;
}

export interface SalesMinuteData {
  minute: number;
  sales: number;
}

export interface DashboardData {
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
  revenueByProduct: { name: string; originalRevenue: number; promoRevenue: number }[];
  minuteTrend: SalesMinuteData[];
}

export interface SavedPlan {
  id: string;
  name: string;
  createdAt: number;
  promotions: ProductPromotion[];
  dashboardData: DashboardData;
}

export const products: Product[] = [
  { id: 'p1', name: '智能手表 Pro', originalPrice: 899, cost: 420, stock: 500 },
  { id: 'p2', name: '无线蓝牙耳机', originalPrice: 299, cost: 110, stock: 1200 },
  { id: 'p3', name: '便携充电宝 20000mAh', originalPrice: 159, cost: 65, stock: 800 },
  { id: 'p4', name: '机械键盘 RGB版', originalPrice: 459, cost: 200, stock: 350 },
  { id: 'p5', name: '高清摄像头 1080P', originalPrice: 189, cost: 78, stock: 600 },
  { id: 'p6', name: '人体工学办公椅', originalPrice: 1299, cost: 580, stock: 150 },
  { id: 'p7', name: '4K显示器 27英寸', originalPrice: 1899, cost: 890, stock: 200 },
  { id: 'p8', name: '蓝牙音箱 便携款', originalPrice: 259, cost: 95, stock: 900 },
  { id: 'p9', name: '智能台灯 护眼版', originalPrice: 199, cost: 72, stock: 700 },
  { id: 'p10', name: '笔记本支架 铝合金', originalPrice: 129, cost: 45, stock: 1000 },
  { id: 'p11', name: '无线鼠标 静音版', originalPrice: 89, cost: 32, stock: 1500 },
  { id: 'p12', name: '数据线套装 Type-C', originalPrice: 49, cost: 15, stock: 3000 },
];

export function calculatePromoPrice(product: Product, promotion: PromotionConfig): number {
  switch (promotion.type) {
    case 'fullReduction':
      if (promotion.fullReduction && product.originalPrice >= promotion.fullReduction.threshold) {
        return Math.max(0, product.originalPrice - promotion.fullReduction.discount);
      }
      return product.originalPrice;
    case 'discount':
      if (promotion.discount) {
        return Math.round(product.originalPrice * promotion.discount.rate * 100) / 100;
      }
      return product.originalPrice;
    case 'bundle':
      return product.originalPrice;
    default:
      return product.originalPrice;
  }
}

export function calculateProfit(product: Product, promoPrice: number): number {
  return Math.round((promoPrice - product.cost) * 100) / 100;
}

export function estimateSalesMultiplier(promotion: PromotionConfig): number {
  switch (promotion.type) {
    case 'fullReduction':
      if (promotion.fullReduction) {
        const ratio = promotion.fullReduction.discount / promotion.fullReduction.threshold;
        return 1 + ratio * 3;
      }
      return 1;
    case 'discount':
      if (promotion.discount) {
        return 1 + (1 - promotion.discount.rate) * 4;
      }
      return 1;
    case 'bundle':
      return 1.4;
    default:
      return 1;
  }
}

export function formatCurrency(value: number): string {
  return '¥' + value.toFixed(2);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STORAGE_KEY = 'promotion_plans';

export function savePlan(plan: SavedPlan): void {
  const plans = loadPlans();
  const existingIndex = plans.findIndex((p) => p.id === plan.id);
  if (existingIndex >= 0) {
    plans[existingIndex] = plan;
  } else {
    plans.push(plan);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function loadPlans(): SavedPlan[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as SavedPlan[]) : [];
  } catch {
    return [];
  }
}

export function deletePlan(planId: string): void {
  const plans = loadPlans().filter((p) => p.id !== planId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export interface SimulationState {
  minute: number;
  minuteSales: number[];
  cumulativeSales: number;
  cumulativeOrders: number;
  cumulativeProfit: number;
  productRevenue: { productId: string; original: number; promo: number; units: number }[];
}

export function createInitialSimulationState(productList: Product[]): SimulationState {
  return {
    minute: 0,
    minuteSales: new Array(30).fill(0),
    cumulativeSales: 0,
    cumulativeOrders: 0,
    cumulativeProfit: 0,
    productRevenue: productList.map((p) => ({ productId: p.id, original: 0, promo: 0, units: 0 })),
  };
}

export function simulateSecond(
  state: SimulationState,
  productList: Product[],
  promotionsMap: Map<string, PromotionConfig>
): SimulationState {
  const newState: SimulationState = {
    ...state,
    minuteSales: [...state.minuteSales],
    productRevenue: state.productRevenue.map((r) => ({ ...r })),
  };

  for (const product of productList) {
    const promo = promotionsMap.get(product.id) || { type: 'none' as PromotionType };
    const multiplier = estimateSalesMultiplier(promo);
    const baseProbability = (product.stock / 5000) * 0.08;
    const buyProbability = Math.min(0.9, baseProbability * multiplier);

    if (Math.random() < buyProbability) {
      const promoPrice = calculatePromoPrice(product, promo);
      const profit = calculateProfit(product, promoPrice);

      newState.cumulativeOrders += 1;
      newState.cumulativeSales += promoPrice;
      newState.cumulativeProfit += profit;

      const revenueIdx = newState.productRevenue.findIndex((r) => r.productId === product.id);
      if (revenueIdx >= 0) {
        newState.productRevenue[revenueIdx].units += 1;
        newState.productRevenue[revenueIdx].promo += promoPrice;
        newState.productRevenue[revenueIdx].original += product.originalPrice;
      }

      const currentMinute = Math.min(29, state.minute);
      newState.minuteSales[currentMinute] += 1;
    }
  }

  return newState;
}

export function buildDashboardData(
  state: SimulationState,
  productList: Product[]
): DashboardData {
  return {
    totalSales: Math.round(state.cumulativeSales * 100) / 100,
    totalProfit: Math.round(state.cumulativeProfit * 100) / 100,
    totalOrders: state.cumulativeOrders,
    revenueByProduct: state.productRevenue.map((r) => {
      const product = productList.find((p) => p.id === r.productId);
      return {
        name: product ? product.name : r.productId,
        originalRevenue: Math.round(r.original * 100) / 100,
        promoRevenue: Math.round(r.promo * 100) / 100,
      };
    }),
    minuteTrend: state.minuteSales.map((sales, i) => ({ minute: i + 1, sales })),
  };
}

export function generateSimulationReport(
  dashboardData: DashboardData,
  productList: Product[],
  promotionsMap: Map<string, PromotionConfig>
): {
  roi: number;
  totalProfit: number;
  topProducts: { name: string; units: number; revenue: number }[];
} {
  const totalCost =
    dashboardData.revenueByProduct.reduce((sum, r) => {
      const product = productList.find((p) => p.name === r.name);
      const units = product
        ? Math.round(r.promoRevenue / calculatePromoPrice(product, promotionsMap.get(product.id) || { type: 'none' }))
        : 0;
      return sum + (product ? product.cost * units : 0);
    }, 0) || 1;

  const roi = totalCost > 0 ? Math.round(((dashboardData.totalProfit / totalCost) * 100) * 10) / 10 : 0;

  const productUnits = dashboardData.revenueByProduct.map((r) => {
    const product = productList.find((p) => p.name === r.name);
    const promo = product ? promotionsMap.get(product.id) || { type: 'none' as PromotionType } : { type: 'none' as PromotionType };
    const promoPrice = product ? calculatePromoPrice(product, promo) : 1;
    const units = promoPrice > 0 ? Math.round(r.promoRevenue / promoPrice) : 0;
    return { name: r.name, units, revenue: r.promoRevenue };
  });

  productUnits.sort((a, b) => b.units - a.units);

  return {
    roi,
    totalProfit: dashboardData.totalProfit,
    topProducts: productUnits.slice(0, 3),
  };
}
