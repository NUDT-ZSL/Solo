import { useState, useEffect } from 'react';
import ProductGrid from './components/ProductGrid';
import CartPanel from './components/CartPanel';
import { cartModule } from './modules/cartModule';
import './App.css';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const unsubscribe = cartModule.subscribe(() => {
      setCartCount(cartModule.getTotalQuantity());
    });
    return unsubscribe;
  }, []);

  const handleAddToCart = () => {
    setIsCartOpen(true);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">✦</span>
            <h1>文创商店</h1>
          </div>
          <button className="cart-toggle" onClick={toggleCart}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="hero-section">
          <div className="hero-content">
            <h2>发现生活中的文艺之美</h2>
            <p>精选四大风格系列文创，为日常增添一份诗意</p>
          </div>
        </section>

        <ProductGrid onAddToCart={handleAddToCart} />
      </main>

      <footer className="app-footer">
        <p>© 2024 文创商店 · 用心创造美好</p>
      </footer>

      <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default App;
