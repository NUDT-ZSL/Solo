export interface Material {
  id: string;
  name: string;
  thumbnail: string;
  image: string;
  category: string;
  tags: string[];
  width: number;
  height: number;
}

export interface PaginatedResponse {
  data: Material[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

type SortField = 'name' | 'category';
type SortOrder = 'asc' | 'desc';

interface CacheEntry {
  key: string;
  data: Material[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = 'material_cache';
const FAVORITES_KEY = 'favorite_materials';

export class DataService {
  private cache: Map<string, CacheEntry> = new Map();
  private favorites: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const savedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (savedFavorites) {
        this.favorites = new Set(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.warn('Failed to load from storage:', e);
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...this.favorites]));
    } catch (e) {
      console.warn('Failed to save favorites:', e);
    }
  }

  private getCacheKey(params: Record<string, string | number | undefined>): string {
    return Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('&');
  }

  async fetchMaterials(
    category?: string,
    search?: string,
    page: number = 1,
    limit: number = 6
  ): Promise<PaginatedResponse> {
    const params: Record<string, string | number> = { page, limit };
    if (category) params.category = category;
    if (search) params.search = search;
    const cacheKey = this.getCacheKey(params);

    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL) {
      const start = (page - 1) * limit;
      const end = start + limit;
      return {
        data: cached.data.slice(start, end),
        total: cached.data.length,
        page,
        limit,
        hasMore: end < cached.data.length
      };
    }

    const query = new URLSearchParams();
    if (category) query.append('category', category);
    if (search) query.append('search', search);
    query.append('page', String(page));
    query.append('limit', String(limit));

    const response = await fetch(`/api/materials?${query.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch materials');
    }
    const result = await response.json() as PaginatedResponse;
    return result;
  }

  async fetchCategories(): Promise<string[]> {
    const cacheKey = 'categories';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as unknown as string[];
    }

    const response = await fetch('/api/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const result = await response.json() as { data: string[] };
    this.cache.set(cacheKey, {
      key: cacheKey,
      data: result.data as unknown as Material[],
      timestamp: Date.now()
    });
    return result.data;
  }

  async fetchTags(): Promise<string[]> {
    const cacheKey = 'tags';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as unknown as string[];
    }

    const response = await fetch('/api/tags');
    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }
    const result = await response.json() as { data: string[] };
    this.cache.set(cacheKey, {
      key: cacheKey,
      data: result.data as unknown as Material[],
      timestamp: Date.now()
    });
    return result.data;
  }

  async uploadMaterial(
    image: string,
    name: string,
    category: string,
    tags: string[]
  ): Promise<Material> {
    if (!tags || tags.length === 0) {
      throw new Error('至少选择1个标签');
    }

    const response = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, image, category, tags })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '上传失败' }));
      throw new Error(error.error || '上传失败');
    }

    this.clearCache();
    const result = await response.json() as { data: Material };
    return result.data;
  }

  sortMaterials(
    materials: Material[],
    field: SortField = 'name',
    order: SortOrder = 'asc'
  ): Material[] {
    return [...materials].sort((a, b) => {
      let comparison = 0;
      if (field === 'name') {
        comparison = a.name.localeCompare(b.name, 'zh-CN');
      } else if (field === 'category') {
        comparison = a.category.localeCompare(b.category, 'zh-CN');
      }
      return order === 'asc' ? comparison : -comparison;
    });
  }

  filterByTags(materials: Material[], tags: string[]): Material[] {
    if (tags.length === 0) return materials;
    return materials.filter(m =>
      tags.some(t => m.tags.includes(t))
    );
  }

  addFavorite(materialId: string): void {
    this.favorites.add(materialId);
    this.saveFavorites();
  }

  removeFavorite(materialId: string): void {
    this.favorites.delete(materialId);
    this.saveFavorites();
  }

  toggleFavorite(materialId: string): boolean {
    if (this.favorites.has(materialId)) {
      this.removeFavorite(materialId);
      return false;
    } else {
      this.addFavorite(materialId);
      return true;
    }
  }

  isFavorite(materialId: string): boolean {
    return this.favorites.has(materialId);
  }

  getFavorites(): string[] {
    return [...this.favorites];
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const dataService = new DataService();
