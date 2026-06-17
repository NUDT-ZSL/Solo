import { Brand } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return response as unknown as T;
}

export interface BrandsResponse {
  brands: Brand[];
  lastActiveBrandId: string | null;
}

export const api = {
  getBrands: (): Promise<BrandsResponse> => request<BrandsResponse>('/brands'),

  getBrand: (id: string): Promise<Brand> => request<Brand>(`/brands/${id}`),

  createBrand: (data: Partial<Brand>): Promise<Brand> =>
    request<Brand>('/brands', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateBrand: (id: string, data: Partial<Brand>): Promise<Brand> =>
    request<Brand>(`/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteBrand: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/brands/${id}`, {
      method: 'DELETE'
    }),

  exportCSS: async (id: string, brandName: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/brands/${id}/css`);
    if (!response.ok) {
      throw new Error('Export failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = brandName.replace(/\s+/g, '-').toLowerCase();
    a.download = `brand-${safeName}-variables.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportCSSWithConfig: async (id: string, brandData: Partial<Brand>, brandName: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/brands/${id}/export-css`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(brandData)
    });
    if (!response.ok) {
      throw new Error('Export failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = brandName.replace(/\s+/g, '-').toLowerCase();
    a.download = `brand-${safeName}-variables.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  ensureDefaultBrand: (): Promise<Brand> =>
    request<Brand>('/brands/default', { method: 'POST' })
};
