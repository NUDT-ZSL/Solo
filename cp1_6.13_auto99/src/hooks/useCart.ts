import { useData } from '../context/DataContext';
import type { Book } from '../types';

export function useCart() {
  const {
    cartItems, addToCart, removeFromCart,
    updateQuantity, clearCart, cartTotal, cartCount,
    cartOpen, setCartOpen
  } = useData();

  return {
    cartItems,
    cartTotal,
    cartCount,
    cartOpen,
    setCartOpen,
    addToCart: (book: Book) => addToCart(book),
    removeFromCart: (id: string) => removeFromCart(id),
    updateQuantity: (id: string, qty: number) => updateQuantity(id, qty),
    clearCart
  };
}
