export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageColor: string;
}

export interface Stall {
  id: string;
  name: string;
  category: 'vegetable' | 'bakery' | 'cooked' | 'dessert';
  categoryName: string;
  description: string;
  soldCount: number;
  products: Product[];
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stallId: string;
  stallName: string;
  imageColor: string;
}

export interface Cart {
  items: CartItem[];
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
}

export interface OrderRequest {
  items: CartItem[];
  total: number;
  discount: number;
  finalTotal: number;
  shippingInfo: ShippingInfo;
}

export interface OrderResponse {
  orderId: string;
  success: boolean;
}

export interface PriceResult {
  total: number;
  discount: number;
  finalTotal: number;
}
