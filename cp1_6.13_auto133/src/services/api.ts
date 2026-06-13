import type { Product } from '../main';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getProducts(): Promise<Product[]> {
    return request<Product[]>('/products');
  },

  getProduct(id: string): Promise<Product> {
    return request<Product>(`/products/${id}`);
  },

  getFavorites(): Promise<string[]> {
    return request<string[]>('/favorites');
  },

  addFavorite(productId: string): Promise<{ success: boolean; alreadyFavorited?: boolean }> {
    return request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  removeFavorite(productId: string): Promise<{ success: boolean }> {
    return request(`/favorites/${productId}`, {
      method: 'DELETE',
    });
  },
};
