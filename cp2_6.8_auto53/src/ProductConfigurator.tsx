import React from 'react';
import {
  Product,
  PromotionConfig,
  PromotionType,
  calculatePromoPrice,
  calculateProfit,
  estimateSalesMultiplier,
  formatCurrency,
} from './utils';

interface Props {
  products: Product[];
  promotions: Map<string, PromotionConfig>;
  onPromotionChange: (productId: string, config: PromotionConfig) => void;
}

const promotionOptions: { value: PromotionType; label: string }[] = [
  { value: 'none', label: '不参与活动' },
  { value: 'fullReduction', label: '满减' },
  { value: 'discount', label: '折扣' },
  { value: 'bundle', label: '加购优惠' },
];

const ProductConfigurator: React.FC<Props> = ({ products, promotions, onPromotionChange }) => {
  const handleTypeChange = (productId: string, type: PromotionType) => {
    const baseConfig: PromotionConfig = { type };
    if (type === 'fullReduction') {
      baseConfig.fullReduction = { threshold: 200, discount: 30 };
    } else if (type === 'discount') {
      baseConfig.discount = { rate: 0.7 };
    } else if (type === 'bundle') {
      const otherProducts = products.filter((p) => p.id !== productId);
      baseConfig.bundle = { addOnProductId: otherProducts[0]?.id || '', addOnPrice: 1 };
    }
    onPromotionChange(productId, baseConfig);
  };

  return (
    <div className="product-list">
      {products.map((product) => {
        const promo = promotions.get(product.id) || { type: 'none' as PromotionType };
        const promoPrice = calculatePromoPrice(product, promo);
        const profit = calculateProfit(product, promoPrice);
        const salesMultiplier = estimateSalesMultiplier(promo);

        return (
          <div key={product.id} className="product-card">
            <div className="product-info">
              <div>
                <div className="product-name">{product.name}</div>
                <div className="product-meta">
                  成本: {formatCurrency(product.cost)} | 库存: {product.stock}
                </div>
              </div>
              <div className="product-price-info">
                <div className="original-price">{formatCurrency(product.originalPrice)}</div>
                <div className="promo-price">{formatCurrency(promoPrice)}</div>
                <div className="promo-profit">毛利: {formatCurrency(profit)}</div>
                <div className="sales-estimate">销量预估 ×{salesMultiplier.toFixed(1)}</div>
              </div>
            </div>

            <div className="promo-config">
              <div className="form-group">
                <label>促销方式</label>
                <select
                  className="form-control"
                  value={promo.type}
                  onChange={(e) => handleTypeChange(product.id, e.target.value as PromotionType)}
                >
                  {promotionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {promo.type === 'fullReduction' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      满减门槛
                      <span className="slider-value">¥{promo.fullReduction?.threshold || 0}</span>
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={2000}
                      step={10}
                      value={promo.fullReduction?.threshold || 200}
                      onChange={(e) =>
                        onPromotionChange(product.id, {
                          ...promo,
                          fullReduction: {
                            threshold: Number(e.target.value),
                            discount: promo.fullReduction?.discount || 30,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      减金额
                      <span className="slider-value">¥{promo.fullReduction?.discount || 0}</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={500}
                      step={5}
                      value={promo.fullReduction?.discount || 30}
                      onChange={(e) =>
                        onPromotionChange(product.id, {
                          ...promo,
                          fullReduction: {
                            threshold: promo.fullReduction?.threshold || 200,
                            discount: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {promo.type === 'discount' && (
                <div className="form-group">
                  <label>
                    折扣率
                    <span className="slider-value">{Math.round((promo.discount?.rate || 0.7) * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={promo.discount?.rate || 0.7}
                    onChange={(e) =>
                      onPromotionChange(product.id, {
                        ...promo,
                        discount: { rate: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              )}

              {promo.type === 'bundle' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>加购商品</label>
                    <select
                      className="form-control"
                      value={promo.bundle?.addOnProductId || ''}
                      onChange={(e) =>
                        onPromotionChange(product.id, {
                          ...promo,
                          bundle: {
                            addOnProductId: e.target.value,
                            addOnPrice: promo.bundle?.addOnPrice || 1,
                          },
                        })
                      }
                    >
                      {products
                        .filter((p) => p.id !== product.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      加购价
                      <span className="slider-value">¥{promo.bundle?.addOnPrice || 1}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={promo.bundle?.addOnPrice || 1}
                      onChange={(e) =>
                        onPromotionChange(product.id, {
                          ...promo,
                          bundle: {
                            addOnProductId: promo.bundle?.addOnProductId || '',
                            addOnPrice: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductConfigurator;
