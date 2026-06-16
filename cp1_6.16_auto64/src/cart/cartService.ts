import { Cart, CartItem, PriceResult, Product, Stall } from '../types';

export const createEmptyCart = (): Cart => ({ items: [] });

export const addItem = (cart: Cart, product: Product, stall: Stall): Cart => {
  const existingIndex = cart.items.findIndex((item) => item.productId === product.id);
  if (existingIndex >= 0) {
    const newItems = [...cart.items];
    newItems[existingIndex] = {
      ...newItems[existingIndex],
      quantity: newItems[existingIndex].quantity + 1,
    };
    return { items: newItems };
  }
  const newItem: CartItem = {
    id: `${stall.id}-${product.id}`,
    productId: product.id,
    productName: product.name,
    price: product.price,
    quantity: 1,
    stallId: stall.id,
    stallName: stall.name,
    imageColor: product.imageColor,
  };
  return { items: [...cart.items, newItem] };
};

export const removeItem = (cart: Cart, productId: string): Cart => {
  return { items: cart.items.filter((item) => item.productId !== productId) };
};

export const updateQuantity = (cart: Cart, productId: string, quantity: number): Cart => {
  if (quantity <= 0) {
    return removeItem(cart, productId);
  }
  const validQuantity = Math.max(1, Math.min(99, Math.floor(quantity)));
  const newItems = cart.items.map((item) =>
    item.productId === productId ? { ...item, quantity: validQuantity } : item
  );
  return { items: newItems };
};

export const calculateTotal = (cart: Cart): PriceResult => {
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = total >= 100 ? Math.floor(total * 0.1) : 0;
  const finalTotal = total - discount;
  return { total, discount, finalTotal };
};

export const getItemCount = (cart: Cart): number => {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
};

export const isCartEmpty = (cart: Cart): boolean => {
  return cart.items.length === 0;
};
