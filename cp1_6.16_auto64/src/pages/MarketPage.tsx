import React, { useRef, useState } from 'react';
import { Cart, Product, Stall } from '../types';
import { useMarketData } from '../data/useMarketData';
import { calculateTotal, getItemCount } from '../cart/cartService';

interface MarketPageProps {
  cart: Cart;
  onAddToCart: (product: Product, stall: Stall) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

const CATEGORY_CONFIG: {
  key: Stall['category'];
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'vegetable',
    label: '蔬果',
    color: '#27AE60',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
        <circle cx="20" cy="16" r="10" fill="white" />
        <line x1="20" y1="16" x2="20" y2="36" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'bakery',
    label: '烘焙',
    color: '#F39C12',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
        <path d="M6 28 A14 14 0 0 1 34 28 Z" fill="white" />
      </svg>
    ),
  },
  {
    key: 'cooked',
    label: '熟食',
    color: '#E74C3C',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
        <polygon points="20,4 8,36 32,36" fill="white" />
      </svg>
    ),
  },
  {
    key: 'dessert',
    label: '甜点',
    color: '#9B59B6',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
        <polygon points="12,20 28,20 24,12 16,12" fill="white" />
        <rect x="16" y="20" width="8" height="12" fill="white" />
      </svg>
    ),
  },
];

const ProductCard = React.memo<{
  product: Product;
  onClick: () => void;
}>(({ product, onClick }) => (
  <div className="product-card" onClick={onClick}>
    <div
      className="product-img"
      style={{ background: `linear-gradient(135deg, ${product.imageColor}, ${product.imageColor}88)` }}
    />
    <div className="product-name">{product.name}</div>
    <div className="product-price">¥{product.price}</div>
  </div>
));

ProductCard.displayName = 'ProductCard';

const CartItemRow = React.memo<{
  item: Cart['items'][0];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}>(({ item, onUpdateQuantity, onRemoveItem }) => (
  <div className="cart-item">
    <div className="cart-item-name">{item.productName}</div>
    <div className="cart-item-stall">{item.stallName}</div>
    <div className="cart-item-controls">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="cart-qty-btn" onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}>
          -
        </button>
        <span className="cart-qty">{item.quantity}</span>
        <button className="cart-qty-btn" onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}>
          +
        </button>
      </div>
      <span className="cart-item-price">¥{(item.price * item.quantity).toFixed(0)}</span>
      <button className="cart-delete-btn" onClick={() => onRemoveItem(item.productId)}>
        删除
      </button>
    </div>
  </div>
));

CartItemRow.displayName = 'CartItemRow';

const MarketPage: React.FC<MarketPageProps> = ({
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}) => {
  const { stalls } = useMarketData();
  const [overlayProduct, setOverlayProduct] = useState<Product | null>(null);
  const [overlayStall, setOverlayStall] = useState<Stall | null>(null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({
    vegetable: null,
    bakery: null,
    cooked: null,
    dessert: null,
  });

  const stallsByCategory = (category: Stall['category']) =>
    stalls.filter((s) => s.category === category);

  const scrollToSection = (key: string) => {
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openOverlay = (product: Product, stall: Stall) => {
    setOverlayProduct(product);
    setOverlayStall(stall);
  };

  const closeOverlay = () => {
    setOverlayProduct(null);
    setOverlayStall(null);
  };

  const handleOverlayAdd = () => {
    if (overlayProduct && overlayStall) {
      onAddToCart(overlayProduct, overlayStall);
    }
    closeOverlay();
  };

  const pricing = calculateTotal(cart);
  const itemCount = getItemCount(cart);

  return (
    <div className="market-layout">
      <div className="market-main">
        <div className="category-nav">
          {CATEGORY_CONFIG.map((cat) => (
            <div
              key={cat.key}
              className="category-banner"
              style={{ background: cat.color }}
              onClick={() => scrollToSection(cat.key)}
            >
              <div className="category-banner-icon">{cat.icon}</div>
              <span className="category-banner-label">{cat.label}</span>
            </div>
          ))}
        </div>

        {CATEGORY_CONFIG.map((cat) => (
          <div
            key={cat.key}
            id={`section-${cat.key}`}
            ref={(el) => { sectionRefs.current[cat.key] = el; }}
          >
            <div className="section-title" style={{ borderBottomColor: cat.color }}>
              {cat.label}
            </div>
            <div className="stall-grid">
              {stallsByCategory(cat.key).map((stall) => (
                <div key={stall.id} className="stall-card">
                  <div className="stall-card-header">
                    <div className="stall-card-name">{stall.name}</div>
                  </div>
                  <div className="stall-card-desc">{stall.description}</div>
                  <div className="product-grid">
                    {stall.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() => openOverlay(product, stall)}
                      />
                    ))}
                  </div>
                  <div className="stall-sold-badge">已售{stall.soldCount}份</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cart-panel">
        <div className="cart-header">
          🛒 购物车
          {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
        </div>

        {cart.items.length === 0 ? (
          <div className="cart-empty">购物车是空的，快去选购吧~</div>
        ) : (
          <>
            <div className="cart-items">
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                />
              ))}
            </div>
            <div className="cart-footer">
              <div className="cart-total-row">
                <span>小计</span>
                <span>¥{pricing.total.toFixed(0)}</span>
              </div>
              {pricing.discount > 0 && (
                <div className="cart-total-row">
                  <span>优惠</span>
                  <span className="cart-discount">-¥{pricing.discount.toFixed(0)}</span>
                </div>
              )}
              <div className="cart-total-row final">
                <span>合计</span>
                <span>¥{pricing.finalTotal.toFixed(0)}</span>
              </div>
              <button
                className={`cart-checkout-btn${cart.items.length > 0 ? ' has-items' : ''}`}
                onClick={onCheckout}
              >
                去结算
              </button>
            </div>
          </>
        )}
      </div>

      {overlayProduct && overlayStall && (
        <div className="overlay-backdrop" onClick={closeOverlay}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <div
              className="overlay-img"
              style={{
                background: `linear-gradient(135deg, ${overlayProduct.imageColor}, ${overlayProduct.imageColor}88)`,
              }}
            />
            <div className="overlay-body">
              <div className="overlay-title">{overlayProduct.name}</div>
              <div className="overlay-desc">{overlayProduct.description}</div>
              <div className="overlay-price">¥{overlayProduct.price}</div>
              <button className="overlay-add-btn" onClick={handleOverlayAdd}>
                加入购物车
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketPage;
