import { useState, useEffect, useMemo } from 'react';
import { filterProducts, fetchProducts, STYLE_OPTIONS, type Product, type StyleFilter } from '../modules/productModule';
import { cartModule } from '../modules/cartModule';
import './ProductGrid.css';

interface ProductGridProps {
  onAddToCart: () => void;
}

export default function ProductGrid({ onAddToCart }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeFilter, setActiveFilter] = useState<StyleFilter>('全部');
  const [isLoading, setIsLoading] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (error) {
        console.error('加载产品失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return filterProducts(products, activeFilter);
  }, [products, activeFilter]);

  const handleFilterChange = (filter: StyleFilter) => {
    setActiveFilter(filter);
    setAnimationKey(prev => prev + 1);
  };

  const handleAddToCart = (product: Product) => {
    cartModule.addItem(product);
    onAddToCart();
  };

  if (isLoading) {
    return (
      <div className="product-grid-loading">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="product-grid-container">
      <div className="filter-bar">
        {STYLE_OPTIONS.map(style => (
          <button
            key={style}
            className={`filter-button ${activeFilter === style ? 'active' : ''}`}
            onClick={() => handleFilterChange(style)}
          >
            {style}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-illustration">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="50" stroke="#E0D8D0" strokeWidth="2" strokeDasharray="6 4" />
              <path d="M45 45 L75 75 M75 45 L45 75" stroke="#C0B8B0" strokeWidth="3" strokeLinecap="round" />
              <rect x="35" y="80" width="50" height="8" rx="4" fill="#E8E2DC" />
            </svg>
          </div>
          <p className="empty-text">暂无该风格的产品</p>
          <p className="empty-hint">试试选择其他风格吧</p>
        </div>
      ) : (
        <div className="product-grid" key={animationKey}>
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className="product-card"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="product-image-wrapper">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="product-image"
                  loading="lazy"
                />
                <span className="style-tag">{product.style}</span>
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-footer">
                  <span className="product-price">¥{product.price}</span>
                  <button
                    className="add-cart-button"
                    onClick={() => handleAddToCart(product)}
                  >
                    加入购物车
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
