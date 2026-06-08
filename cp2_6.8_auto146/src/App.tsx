import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConfigPanel from './components/ConfigPanel';
import ProductGrid from './components/ProductGrid';
import Dashboard from './components/Dashboard';
import { simulatePromotion } from './api/simulation';
import { PromotionRules, Product, SimulationResult } from './types';

const DEFAULT_RULES: PromotionRules = {
  promoType: 'discount',
  discountRate: 20,
  thresholdDiscounts: [
    { threshold: 100, discount: 20 },
    { threshold: 200, discount: 50 },
    { threshold: 300, discount: 80 },
    { threshold: 500, discount: 150 },
    { threshold: 1000, discount: 300 },
  ],
  selectedThresholdIndex: 1,
  bundleProductId1: 0,
  bundleProductId2: 1,
};

const EMPTY_PRODUCTS: Product[] = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  name: '加载中...',
  icon: '📦',
  originalPrice: 0,
  stock: 0,
  baseSales: 0,
  discountPrice: 0,
  estimatedSalesLift: 0,
  inventoryConsumptionRate: 0,
  salesBefore: 0,
  salesAfter: 0,
  isBundleEligible: true,
}));

const App: React.FC = () => {
  const [rules, setRules] = useState<PromotionRules>(DEFAULT_RULES);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSimulation = useCallback(async (currentRules: PromotionRules) => {
    setLoading(true);
    try {
      const result = await simulatePromotion(currentRules);
      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSimulation(rules);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      runSimulation(rules);
    }, 100);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [rules, runSimulation]);

  const handleRulesChange = (newRules: PromotionRules) => {
    setRules(newRules);
  };

  const products = simulationResult?.products ?? EMPTY_PRODUCTS;
  const totalSales = simulationResult?.totalSalesAfter ?? 0;
  const conversionLift = simulationResult?.conversionRateLift ?? 0;
  const inventoryTurnover = simulationResult?.inventoryTurnoverDays ?? 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🛒 促销活动模拟器</h1>
        <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '4px' }}>
          配置促销规则，实时预测活动效果
        </p>
      </header>

      <div className="app-layout">
        <ConfigPanel
          rules={rules}
          products={products}
          onRulesChange={handleRulesChange}
        />

        <div className="main-content">
          <Dashboard
            totalSales={totalSales}
            conversionLift={conversionLift}
            inventoryTurnover={inventoryTurnover}
            products={products}
            loading={loading}
          />

          <div>
            <h2 className="section-title" style={{ marginBottom: '16px' }}>
              商品列表（共 {products.length} 件）
            </h2>
            <ProductGrid products={products} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
