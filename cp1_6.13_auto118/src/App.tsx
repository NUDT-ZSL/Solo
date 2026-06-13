import { useState, useEffect, useCallback } from 'react';
import type { CartItem, MenuItem, Page, User } from './types';
import { getUser } from './api';
import Menu from './Menu';
import Cart from './Cart';
import Profile from './Profile';
import AdminOrders from './AdminOrders';
import AdminMenu from './AdminMenu';

export default function App() {
  const [page, setPage] = useState<Page>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const data = await getUser();
      setUser(data);
    } catch {
      console.error('Failed to fetch user');
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    showToast(`已添加 ${item.name} 到购物车`);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0);
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <nav className="nav-bar">
        <div className="nav-brand font-display">BrewBook</div>
        <ul className="nav-links">
          <li>
            <button
              className={`nav-link ${page === 'menu' ? 'active' : ''}`}
              onClick={() => navigate('menu')}
            >
              首页
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${page === 'profile' ? 'active' : ''}`}
              onClick={() => navigate('profile')}
            >
              我的积分
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${page === 'admin-orders' ? 'active' : ''}`}
              onClick={() => navigate('admin-orders')}
            >
              订单管理
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${page === 'admin-menu' ? 'active' : ''}`}
              onClick={() => navigate('admin-menu')}
            >
              菜单管理
            </button>
          </li>
          <li>
            <button
              className="nav-cart-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Shopping cart"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && <span className="nav-cart-count">{cartCount}</span>}
            </button>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        {page === 'menu' && <Menu onAddToCart={addToCart} />}
        {page === 'profile' && (
          <Profile user={user} onPointsChange={fetchUser} showToast={showToast} />
        )}
        {page === 'admin-orders' && <AdminOrders showToast={showToast} />}
        {page === 'admin-menu' && <AdminMenu showToast={showToast} />}
      </main>

      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={updateCartQty}
        onClear={clearCart}
        showToast={showToast}
        onOrderSuccess={() => {
          fetchUser();
        }}
      />

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
