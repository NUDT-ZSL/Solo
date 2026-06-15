import type { Product } from './productModule';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderSummary {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  orderId: string;
  createdAt: string;
}

export interface CartState {
  items: CartItem[];
}

type Listener = (state: CartState) => void;

function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

class CartModule {
  private state: CartState = { items: [] };
  private listeners: Set<Listener> = new Set();

  getState(): CartState {
    return { ...this.state, items: [...this.state.items] };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  addItem(product: Product): void {
    const existingItem = this.state.items.find(item => item.product.id === product.id);
    
    if (existingItem) {
      this.state.items = this.state.items.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      this.state.items = [...this.state.items, { product, quantity: 1 }];
    }
    
    this.notify();
  }

  removeItem(productId: string): void {
    this.state.items = this.state.items.filter(item => item.product.id !== productId);
    this.notify();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    this.state.items = this.state.items.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    );
    
    this.notify();
  }

  getTotalQuantity(): number {
    return this.state.items.reduce((total, item) => total + item.quantity, 0);
  }

  getTotalPrice(): number {
    return this.state.items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  generateOrderSummary(): OrderSummary {
    return {
      items: [...this.state.items],
      totalQuantity: this.getTotalQuantity(),
      totalPrice: this.getTotalPrice(),
      orderId: generateOrderId(),
      createdAt: new Date().toISOString()
    };
  }

  clearCart(): void {
    this.state.items = [];
    this.notify();
  }
}

export const cartModule = new CartModule();
