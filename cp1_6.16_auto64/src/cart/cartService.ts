import { Cart, CartItem, PriceResult, Product, Stall } from '../types';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;
const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.1;

export const createEmptyCart = (): Cart => ({ items: [] });

export const addItem = (cart: Cart, product: Product, stall: Stall): Cart => {
  const existingIndex = cart.items.findIndex((item) => item.productId === product.id);
  if (existingIndex >= 0) {
    const existing = cart.items[existingIndex];
    if (existing.quantity >= MAX_QUANTITY) {
      return cart;
    }
    const newItems = [...cart.items];
    newItems[existingIndex] = {
      ...existing,
      quantity: existing.quantity + 1,
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
  const validatedQty = validateQuantity(quantity);
  if (validatedQty <= 0) {
    return removeItem(cart, productId);
  }
  const newItems = cart.items.map((item) =>
    item.productId === productId ? { ...item, quantity: validatedQty } : item
  );
  return { items: newItems };
};

const validateQuantity = (quantity: number): number => {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(quantity)));
};

export const calculateTotal = (cart: Cart): PriceResult => {
  const total = cart.items.reduce((sum, item) => {
    const lineTotal = item.price * item.quantity;
    return sum + lineTotal;
  }, 0);
  const discount = applyDiscount(total);
  const finalTotal = total - discount;
  return {
    total: Math.round(total * 100) / 100,
    discount,
    finalTotal: Math.round((total - discount) * 100) / 100,
  };
};

const applyDiscount = (total: number): number => {
  if (total < DISCOUNT_THRESHOLD) return 0;
  return Math.floor(total * DISCOUNT_RATE);
};

export const getItemCount = (cart: Cart): number => {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
};

export const isCartEmpty = (cart: Cart): boolean => {
  return cart.items.length === 0;
};
