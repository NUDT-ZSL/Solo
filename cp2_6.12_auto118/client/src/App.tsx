import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Cart from './components/Cart';
import WorksPage from './pages/WorksPage';
import CoursesPage from './pages/CoursesPage';
import type { CartItem } from './types';

function App() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();

  const addToCart = (work: CartItem['work']) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.work.id === work.id);
      if (existing) {
        return prev.map(item =>
          item.work.id === work.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { work, quantity: 1 }];
    });
  };

  const updateQuantity = (workId: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(item =>
          item.work.id === workId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.work.price * item.quantity, 0);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF8F0' }}>
      <Navbar
        cartCount={totalItems}
        onCartClick={() => setIsCartOpen(true)}
      />
      <div style={{ paddingTop: 60 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Routes location={location}>
              <Route
                path="/"
                element={
                  <WorksPage
                    cartItems={cartItems}
                    onAddToCart={addToCart}
                    onOpenCart={() => setIsCartOpen(true)}
                  />
                }
              />
              <Route path="/courses" element={<CoursesPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onClear={clearCart}
        totalPrice={totalPrice}
      />
    </div>
  );
}

export default App;
