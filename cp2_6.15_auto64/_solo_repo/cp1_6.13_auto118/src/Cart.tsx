import { useState } from 'react';
import type { CartItem } from './types';
import { submitOrder } from './api';

interface CartProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onClear: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onOrderSuccess: () => void;
}

export default function Cart({
  open,
  onClose,
  items,
  onUpdateQty,
  onClear,
  showToast,
  onOrderSuccess,
}: CartProps) {
  const [submitting, setSubmitting] = useState(false);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const estimatedPoints = Math.floor(total / 10);

  const handleSubmit = async () => {
    if (items.length === 0 || submitting) return;

    setSubmitting(true);
    const start = performance.now();

    try {
      const order = await submitOrder({
        items: items.map((i) => ({
          menuItemId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      });
      console.debug(`Order submit: ${(performance.now() - start).toFixed(0)}ms`);
      showToast(`下单成功！订单号：${order.id.slice(0, 8)}`);
      onClear();
      onOrderSuccess();
      onClose();
    } catch (err) {
      showToast('下单失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQtyChange = (id: string, delta: number) => {
    const start = performance.now();
    onUpdateQty(id, delta);
    console.debug(`Cart update: ${(performance.now() - start).toFixed(0)}ms`);
  };

  return (
    <>
      <div
        className={`cart-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`cart-sidebar ${open ? 'open' : ''}`}>
        <div className="cart-header">
          <h2 className="cart-title font-display">购物车</h2>
          <button className="cart-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">购物车是空的，快去选点饮品吧 ☕</div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-image"
                    loading="lazy"
                  />
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">¥{item.price} × {item.quantity}</div>
                  </div>
                  <div className="cart-item-qty">
                    <button
                      className="qty-btn"
                      onClick={() => handleQtyChange(item.id, -1)}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span className="qty-num">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => handleQtyChange(item.id, 1)}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total-row">
                <span>小计</span>
                <strong>¥{total.toFixed(2)}</strong>
              </div>
              <div className="cart-points">
                预计获得 {estimatedPoints} 积分
              </div>
              <button
                className="cart-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认下单'}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
