import React from 'react';
import { Product } from '../types';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
}

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const heavyDiscount = product.discountPrice < product.originalPrice * 0.7;
  const stockPercent = Math.max(
    0,
    Math.min(100, 100 - product.inventoryConsumptionRate * 2)
  );

  return (
    <div className={`product-card ${heavyDiscount ? 'heavy-discount' : ''}`}>
      <div className="product-icon">{product.icon}</div>
      <div className="product-name">{product.name}</div>
      <div className="price-section">
        <span className="original-price">¥{product.originalPrice.toFixed(2)}</span>
        <span className="discount-price">¥{product.discountPrice.toFixed(2)}</span>
      </div>
      <div className="inventory-section">
        <div className="inventory-label">
          <span>库存</span>
          <span>{product.stock}件</span>
        </div>
        <div className="inventory-bar">
          <div
            className="inventory-fill"
            style={{ width: `${stockPercent}%` }}
          />
        </div>
      </div>
      <div className="sales-lift">
        <span>▲</span>
        <span>预估销量 +{product.estimatedSalesLift}%</span>
      </div>
    </div>
  );
};

const ProductGrid: React.FC<ProductGridProps> = ({ products, loading }) => {
  if (loading) {
    return (
      <div className="product-grid">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="product-card">
            <div className="skeleton" style={{ height: '3rem', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '1rem', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '1.5rem', marginBottom: '12px' }} />
            <div className="skeleton" style={{ height: '0.75rem', marginBottom: '4px' }} />
            <div className="skeleton" style={{ height: '8px', marginBottom: '10px' }} />
            <div className="skeleton" style={{ height: '1rem' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
