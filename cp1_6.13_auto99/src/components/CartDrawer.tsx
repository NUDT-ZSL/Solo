import React, { useState, useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { shareApi, getUserId } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const CartDrawer: React.FC = () => {
  const {
    cartItems, cartOpen, setCartOpen,
    removeFromCart, updateQuantity, cartTotal, clearCart
  } = useCart();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen]);

  const handleShare = async () => {
    if (cartItems.length === 0) return;
    try {
      setSharing(true);
      const res = await shareApi.create({
        userId: getUserId(),
        items: cartItems,
        name: '我的精选书单'
      });
      clearCart();
      navigate(`/share/${res.id}`);
    } catch (e) {
      alert('生成分享链接失败，请重试');
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <div
        className={`drawer-backdrop ${cartOpen ? 'show' : ''}`}
        onClick={() => setCartOpen(false)}
      />
      <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <header className="drawer-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            我的购物车
          </h3>
          <button className="drawer-close" onClick={() => setCartOpen(false)} aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="drawer-body">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-icon">🛒</div>
              <p>购物车还是空的</p>
              <span>快去挑选喜欢的书籍吧~</span>
              <button className="btn-primary" onClick={() => setCartOpen(false)}>去逛逛</button>
            </div>
          ) : (
            <ul className="cart-list">
              {cartItems.map(item => (
                <li key={item.id} className="cart-item">
                  <img src={item.cover} alt={item.title} className="cart-item-cover" />
                  <div className="cart-item-info">
                    <div className="cart-item-title">{item.title}</div>
                    <div className="cart-item-author">{item.author}</div>
                    <div className="cart-item-row">
                      <span className="cart-item-price">¥{item.price.toFixed(2)}</span>
                      <div className="qty-control">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="减少">−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="增加">+</button>
                      </div>
                    </div>
                    <div className="cart-item-footer">
                      <span className="subtotal">小计：¥{(item.price * item.quantity).toFixed(2)}</span>
                      <button className="cart-item-del" onClick={() => removeFromCart(item.id)} aria-label="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cartItems.length > 0 && (
          <footer className="drawer-footer">
            <div className="drawer-total-row">
              <span>共 {cartItems.reduce((s, i) => s + i.quantity, 0)} 件商品，合计：</span>
              <span className="total-amount">¥{cartTotal.toFixed(2)}</span>
            </div>
            <button
              className="btn-share-full"
              onClick={handleShare}
              disabled={sharing}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              {sharing ? '生成中...' : '生成分享书单'}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
