import React, { createContext, useContext, useEffect } from 'react';
import { cartApi, getUserId } from '../utils/api';
import { useData } from './DataContext';
import type { CartItem } from '../types';

const CartContext = createContext<null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cartItems, setCartItems } = useData();
  const userId = getUserId();

  useEffect(() => {
    let mounted = true;
    cartApi.get(userId).then(items => {
      if (mounted && items && items.length) setCartItems(items);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      cartApi.save(userId, cartItems).catch(() => {});
    }, 150);
    return () => clearTimeout(t);
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('bookshelf_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bookshelf_cart');
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed) && parsed.length) setCartItems(parsed);
      }
    } catch {}
  }, []);

  return <CartContext.Provider value={null}>{children}</CartContext.Provider>;
};

export function useCartCtx() { return useContext(CartContext); }
