import axios from 'axios';
import { PromotionRules, SimulationResult } from '../types';

const API_BASE = '/api';

export const simulatePromotion = async (rules: PromotionRules): Promise<SimulationResult> => {
  try {
    const response = await axios.post<SimulationResult>(`${API_BASE}/simulate`, rules);
    return response.data;
  } catch (error) {
    console.error('Simulation API error, using fallback:', error);
    return fallbackSimulation(rules);
  }
};

const fallbackSimulation = (rules: PromotionRules): SimulationResult => {
  const productIcons = ['📱', '💻', '📚', '👗', '👟', '🎧', '⌚', '🎮', '🍳', '🧴', '🎒', '🕶️', '💄', '🧸', '🏀', '🎸', '🖱️', '⌨️', '🖼️', '🌿'];
  const productNames = [
    '智能手机', '笔记本电脑', '畅销图书', '时尚连衣裙', '运动跑鞋',
    '蓝牙耳机', '智能手表', '游戏手柄', '不粘锅具', '护肤套装',
    '双肩背包', '太阳眼镜', '口红礼盒', '毛绒玩具', '篮球装备',
    '民谣吉他', '电竞鼠标', '机械键盘', '装饰画框', '绿植盆栽'
  ];

  const products = productNames.map((name, idx) => {
    const originalPrice = Math.round((50 + Math.random() * 950) * 100) / 100;
    const stock = Math.floor(50 + Math.random() * 450);
    const baseSales = Math.floor(20 + Math.random() * 180);

    let discountPrice = originalPrice;
    let salesLift = 0;

    if (rules.promoType === 'discount') {
      discountPrice = Math.round(originalPrice * (1 - rules.discountRate / 100) * 100) / 100;
      salesLift = rules.discountRate * 1.5;
    } else if (rules.promoType === 'threshold') {
      const td = rules.thresholdDiscounts[rules.selectedThresholdIndex];
      if (td && originalPrice >= td.threshold) {
        discountPrice = Math.round((originalPrice - td.discount) * 100) / 100;
        salesLift = (td.discount / originalPrice) * 100 * 1.2;
      }
    } else if (rules.promoType === 'bundle') {
      if (idx === rules.bundleProductId1 || idx === rules.bundleProductId2) {
        salesLift = 25;
      }
    }

    const salesLiftPct = Math.min(Math.round(salesLift * 10) / 10, 80);
    const estimatedSales = Math.round(baseSales * (1 + salesLiftPct / 100));
    const consumptionRate = Math.round((estimatedSales / stock) * 1000) / 10;

    return {
      id: idx,
      name,
      icon: productIcons[idx],
      originalPrice,
      stock,
      baseSales,
      discountPrice,
      estimatedSalesLift: salesLiftPct,
      inventoryConsumptionRate: consumptionRate,
      salesBefore: Math.round(originalPrice * baseSales * 100) / 100,
      salesAfter: Math.round(discountPrice * estimatedSales * 100) / 100,
      isBundleEligible: true,
    };
  });

  if (rules.promoType === 'bundle') {
    const p1 = products[rules.bundleProductId1];
    const p2 = products[rules.bundleProductId2];
    if (p1 && p2) {
      const originalTotal = p1.originalPrice + p2.originalPrice;
      const bundlePrice = Math.round(originalTotal * 0.8 * 100) / 100;
      p1.discountPrice = Math.round(bundlePrice * (p1.originalPrice / originalTotal) * 100) / 100;
      p2.discountPrice = Math.round(bundlePrice * (p2.originalPrice / originalTotal) * 100) / 100;
    }
  }

  const totalSalesBefore = products.reduce((s, p) => s + p.salesBefore, 0);
  const totalSalesAfter = products.reduce((s, p) => s + p.salesAfter, 0);
  const avgLift = products.reduce((s, p) => s + p.estimatedSalesLift, 0) / products.length;
  const avgConsumption = products.reduce((s, p) => s + p.inventoryConsumptionRate, 0) / products.length;
  const turnoverDays = Math.round((100 / Math.max(avgConsumption, 0.1)) * 10) / 10;

  return {
    products,
    totalSalesBefore,
    totalSalesAfter,
    conversionRateLift: Math.round(avgLift * 10) / 10,
    inventoryTurnoverDays: turnoverDays,
    thresholdDiscounts: rules.thresholdDiscounts,
  };
};
