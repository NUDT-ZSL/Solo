import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProductConfigurator from './ProductConfigurator';
import Dashboard from './Dashboard';
import {
  products,
  PromotionConfig,
  ProductPromotion,
  DashboardData,
  SavedPlan,
  savePlan,
  loadPlans,
  deletePlan,
  generateId,
  formatCurrency,
  formatDateTime,
} from './utils';

const App: React.FC = () => {
  const [promotions, setPromotions] = useState<Map<string, PromotionConfig>>(() => {
    const map = new Map<string, PromotionConfig>();
    products.forEach((p) => map.set(p.id, { type: 'none' }));
    return map;
  });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);

  const [showPlans, setShowPlans] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [planName, setPlanName] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setSavedPlans(loadPlans());
  }, []);

  const handlePromotionChange = useCallback((productId: string, config: PromotionConfig) => {
    setPromotions((prev) => {
      const next = new Map(prev);
      next.set(productId, config);
      return next;
    });
    setLoadedPlanId(null);
  }, []);

  const handleDashboardChange = useCallback((data: DashboardData) => {
    setDashboardData(data);
  }, []);

  const handleSavePlan = () => {
    if (!planName.trim()) return;

    const promotionList: ProductPromotion[] = [];
    promotions.forEach((promo, productId) => {
      promotionList.push({ productId, promotion: promo });
    });

    const plan: SavedPlan = {
      id: loadedPlanId || generateId(),
      name: planName.trim(),
      createdAt: Date.now(),
      promotions: promotionList,
      dashboardData: dashboardData || {
        totalSales: 0,
        totalProfit: 0,
        totalOrders: 0,
        revenueByProduct: products.map((p) => ({
          name: p.name,
          originalRevenue: 0,
          promoRevenue: 0,
        })),
        minuteTrend: new Array(30).fill(0).map((_, i) => ({ minute: i + 1, sales: 0 })),
      },
    };

    savePlan(plan);
    setSavedPlans(loadPlans());
    setLoadedPlanId(plan.id);
    setShowSaveDialog(false);
    setPlanName('');
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    const map = new Map<string, PromotionConfig>();
    plan.promotions.forEach((pp) => {
      map.set(pp.productId, pp.promotion);
    });
    products.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, { type: 'none' });
      }
    });
    setPromotions(map);
    setDashboardData(plan.dashboardData);
    setLoadedPlanId(plan.id);
    setShowPlans(false);
    setMobileMenuOpen(false);
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('确定要删除此方案吗？')) {
      deletePlan(planId);
      setSavedPlans(loadPlans());
      if (loadedPlanId === planId) {
        setLoadedPlanId(null);
      }
    }
  };

  const openSaveDialog = () => {
    setPlanName(loadedPlanId && savedPlans.find((p) => p.id === loadedPlanId)?.name || '');
    setShowSaveDialog(true);
  };

  const initialDashboardData = useMemo(() => {
    if (loadedPlanId && dashboardData) return dashboardData;
    return null;
  }, [loadedPlanId, dashboardData]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-mobile-menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <h1>
            🛒 促销活动<span>模拟器</span>
          </h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={openSaveDialog}>
            💾 保存方案
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPlans(true)}>
            📂 方案列表
          </button>
        </div>
      </header>

      <div className="app-container">
        <div
          className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <aside className={`config-panel ${mobileMenuOpen ? 'open' : ''}`}>
          <h2>🎯 商品促销配置</h2>
          <ProductConfigurator
            products={products}
            promotions={promotions}
            onPromotionChange={handlePromotionChange}
          />
        </aside>

        <main className="dashboard-panel">
          <Dashboard
            key={loadedPlanId || 'default'}
            products={products}
            promotions={promotions}
            onDashboardChange={handleDashboardChange}
            initialData={initialDashboardData}
          />
        </main>
      </div>

      {showPlans && (
        <div className="plans-overlay" onClick={() => setShowPlans(false)}>
          <div className="plans-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plans-header">
              <h2>📂 已保存方案</h2>
              <button className="btn btn-outline" onClick={() => setShowPlans(false)}>
                关闭
              </button>
            </div>
            {savedPlans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>暂无保存的方案</p>
                <p style={{ fontSize: 12, marginTop: 8 }}>配置活动后点击「保存方案」创建</p>
              </div>
            ) : (
              <div className="plans-grid">
                {savedPlans.map((plan) => (
                  <div className="plan-card" key={plan.id}>
                    <div className="plan-card-header">
                      <div className="plan-name">{plan.name}</div>
                      {loadedPlanId === plan.id && (
                        <span style={{ background: '#FF6B35', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>
                          当前
                        </span>
                      )}
                    </div>
                    <div className="plan-date">{formatDateTime(plan.createdAt)}</div>
                    <div className="plan-sales">{formatCurrency(plan.dashboardData.totalSales)}</div>
                    <div className="plan-actions">
                      <button className="btn btn-outline" onClick={() => handleLoadPlan(plan)}>
                        加载
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeletePlan(plan.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="plans-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{loadedPlanId ? '更新方案' : '保存方案'}</h3>
            <div className="form-group">
              <label>方案名称</label>
              <input
                type="text"
                className="form-control"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="如：618大促活动方案"
                autoFocus
              />
            </div>
            <div className="save-dialog-actions">
              <button className="btn btn-outline" onClick={() => setShowSaveDialog(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSavePlan} disabled={!planName.trim()}>
                {loadedPlanId ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
