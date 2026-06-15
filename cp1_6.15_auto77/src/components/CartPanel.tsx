import { useState, useEffect } from 'react';
import { cartModule, type CartState, type OrderSummary } from '../modules/cartModule';
import './CartPanel.css';

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartPanel({ isOpen, onClose }: CartPanelProps) {
  const [cartState, setCartState] = useState<CartState>(cartModule.getState());
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  useEffect(() => {
    const unsubscribe = cartModule.subscribe((state) => {
      setCartState(state);
    });
    return unsubscribe;
  }, []);

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = cartState.items.find(i => i.product.id === productId);
    if (item) {
      cartModule.updateQuantity(productId, item.quantity + delta);
    }
  };

  const handleRemoveItem = (productId: string) => {
    cartModule.removeItem(productId);
  };

  const handleCheckout = () => {
    const summary = cartModule.generateOrderSummary();
    setOrderSummary(summary);
    setShowOrderModal(true);
  };

  const handleConfirmOrder = () => {
    cartModule.clearCart();
    setShowOrderModal(false);
    onClose();
  };

  const handleCloseModal = () => {
    setShowOrderModal(false);
  };

  const totalQuantity = cartModule.getTotalQuantity();
  const totalPrice = cartModule.getTotalPrice();

  return (
    <>
      {isOpen && (
        <div className="cart-overlay" onClick={onClose} />
      )}
      
      <div className={`cart-panel ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>购物车</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {cartState.items.length === 0 ? (
          <div className="cart-empty">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="35" stroke="#E0D8D0" strokeWidth="2" strokeDasharray="4 3" />
              <path d="M28 32 L52 32 L48 56 L32 56 Z" stroke="#C0B8B0" strokeWidth="2.5" fill="none" />
              <circle cx="35" cy="62" r="3" fill="#D0C8C0" />
              <circle cx="45" cy="62" r="3" fill="#D0C8C0" />
            </svg>
            <p className="cart-empty-text">购物车还是空的</p>
            <p className="cart-empty-hint">去挑选喜欢的商品吧</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartState.items.map(item => (
                <div key={item.product.id} className="cart-item">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="cart-item-image"
                  />
                  <div className="cart-item-info">
                    <h3 className="cart-item-name">{item.product.name}</h3>
                    <p className="cart-item-price">¥{item.product.price}</p>
                    <div className="cart-item-actions">
                      <button
                        className="quantity-button minus"
                        onClick={() => handleQuantityChange(item.product.id, -1)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="4" y1="8" x2="12" y2="8"></line>
                        </svg>
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        className="quantity-button plus"
                        onClick={() => handleQuantityChange(item.product.id, 1)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="8" y1="4" x2="8" y2="12"></line>
                          <line x1="4" y1="8" x2="12" y2="8"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveItem(item.product.id)}
                    title="删除"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-summary">
                <div className="summary-row">
                  <span>共 {totalQuantity} 件商品</span>
                  <span className="total-price">¥{totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <button className="checkout-button" onClick={handleCheckout}>
                去结算
              </button>
            </div>
          </>
        )}
      </div>

      {showOrderModal && orderSummary && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>订单确认</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="order-summary">
                <p className="order-id">订单号：{orderSummary.orderId}</p>
                <div className="order-items">
                  {orderSummary.items.map(item => (
                    <div key={item.product.id} className="order-item">
                      <span>{item.product.name} × {item.quantity}</span>
                      <span>¥{(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <span>合计</span>
                  <span className="order-total-price">¥{orderSummary.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={handleCloseModal}>取消</button>
              <button className="modal-confirm" onClick={handleConfirmOrder}>确认下单</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
