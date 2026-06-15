import React from 'react';
import { PromotionRules, PromoType, Product, ThresholdDiscount } from '../types';

interface ConfigPanelProps {
  rules: PromotionRules;
  products: Product[];
  onRulesChange: (rules: PromotionRules) => void;
}

const THRESHOLD_OPTIONS: ThresholdDiscount[] = [
  { threshold: 100, discount: 20 },
  { threshold: 200, discount: 50 },
  { threshold: 300, discount: 80 },
  { threshold: 500, discount: 150 },
  { threshold: 1000, discount: 300 },
];

const ConfigPanel: React.FC<ConfigPanelProps> = ({ rules, products, onRulesChange }) => {
  const handlePromoTypeChange = (type: PromoType) => {
    onRulesChange({ ...rules, promoType: type });
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onRulesChange({ ...rules, discountRate: Number(e.target.value) });
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRulesChange({ ...rules, selectedThresholdIndex: Number(e.target.value) });
  };

  const handleBundleProduct1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    onRulesChange({
      ...rules,
      bundleProductId1: id,
      bundleProductId2: id === rules.bundleProductId2
        ? (rules.bundleProductId1 !== -1 ? rules.bundleProductId1 : (id + 1) % products.length)
        : rules.bundleProductId2,
    });
  };

  const handleBundleProduct2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    onRulesChange({
      ...rules,
      bundleProductId2: id,
      bundleProductId1: id === rules.bundleProductId1
        ? (rules.bundleProductId2 !== -1 ? rules.bundleProductId2 : (id + 1) % products.length)
        : rules.bundleProductId1,
    });
  };

  const getBundlePriceInfo = () => {
    const p1 = products[rules.bundleProductId1];
    const p2 = products[rules.bundleProductId2];
    if (!p1 || !p2) return null;
    const originalTotal = p1.originalPrice + p2.originalPrice;
    const bundlePrice = Math.round(originalTotal * 0.8 * 100) / 100;
    const saved = Math.round((originalTotal - bundlePrice) * 100) / 100;
    return { originalTotal, bundlePrice, saved };
  };

  const bundleInfo = rules.promoType === 'bundle' ? getBundlePriceInfo() : null;

  return (
    <div className="config-panel">
      <h2 className="section-title">促销规则配置</h2>

      <div className="promo-type-tabs">
        <button
          className={`promo-type-tab ${rules.promoType === 'discount' ? 'active' : ''}`}
          onClick={() => handlePromoTypeChange('discount')}
        >
          限时折扣
        </button>
        <button
          className={`promo-type-tab ${rules.promoType === 'threshold' ? 'active' : ''}`}
          onClick={() => handlePromoTypeChange('threshold')}
        >
          满减优惠
        </button>
        <button
          className={`promo-type-tab ${rules.promoType === 'bundle' ? 'active' : ''}`}
          onClick={() => handlePromoTypeChange('bundle')}
        >
          捆绑销售
        </button>
      </div>

      <hr className="divider" />

      {rules.promoType === 'discount' && (
        <div className="form-group">
          <label className="form-label">折扣比例</label>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min={0}
              max={50}
              step={5}
              value={rules.discountRate}
              onChange={handleDiscountChange}
            />
            <span className="slider-value">{rules.discountRate}%</span>
          </div>
        </div>
      )}

      {rules.promoType === 'threshold' && (
        <div className="form-group">
          <label className="form-label">满减门槛</label>
          <select
            className="select-input"
            value={rules.selectedThresholdIndex}
            onChange={handleThresholdChange}
          >
            {THRESHOLD_OPTIONS.map((td, idx) => (
              <option key={idx} value={idx}>
                满{td.threshold}元减{td.discount}元
              </option>
            ))}
          </select>
        </div>
      )}

      {rules.promoType === 'bundle' && (
        <div className="form-group">
          <label className="form-label">选择捆绑商品</label>
          <div className="bundle-selects">
            <select
              className="select-input"
              value={rules.bundleProductId1}
              onChange={handleBundleProduct1Change}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
            <select
              className="select-input"
              value={rules.bundleProductId2}
              onChange={handleBundleProduct2Change}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
          {bundleInfo && (
            <div className="bundle-info">
              <div>原价合计：¥{bundleInfo.originalTotal.toFixed(2)}</div>
              <div>
                捆绑价：<strong>¥{bundleInfo.bundlePrice.toFixed(2)}</strong>（8折）
              </div>
              <div>立省：¥{bundleInfo.saved.toFixed(2)}</div>
            </div>
          )}
        </div>
      )}

      <hr className="divider" />

      <div style={{ fontSize: '0.8rem', color: '#718096', lineHeight: 1.6 }}>
        💡 提示：调整配置后，右侧看板将自动更新模拟结果
      </div>
    </div>
  );
};

export default ConfigPanel;
