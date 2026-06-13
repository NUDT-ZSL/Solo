import React, { createContext, useContext, useEffect } from 'react';
import { cartApi, getUserId } from '../utils/api';
import { useData } from './DataContext';

const CartContext = createContext<null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cartItems, setCartItems, addToCart, removeFromCart, updateQuantity } = useData();
  const userId = getUserId();

  useEffect(() => {
    let mounted = true;
    const raw = localStorage.getItem('bookshelf_cart');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setCartItems(parsed);
          return;
        }
      } catch {}
    }
    cartApi.get(userId).then(items => {
      if (mounted && items && items.length) setCartItems(items);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bookshelf_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  useEffect(() => {
    const t = setTimeout(() => {
      cartApi.save(userId, cartItems).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [cartItems]);

  return <CartContext.Provider value={null}>{children}</CartContext.Provider>;
};

export function useCartCtx() { return useContext(CartContext); }
