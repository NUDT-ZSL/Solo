import axios from 'axios';
import type {
  Asset,
  AssetListResponse,
  CreateAssetDto,
  UpdateAssetDto,
  FavoriteResponse,
} from '@shared/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const assetApi = {
  async getAssets(searchQuery?: string, authorId?: string): Promise<Asset[]> {
    const params: Record<string, string> = {};
    if (searchQuery) params.q = searchQuery;
    if (authorId) params.authorId = authorId;

    const response = await api.get<AssetListResponse>('/assets', { params });
    return response.data.data;
  },

  async getAsset(id: string): Promise<Asset> {
    const response = await api.get<{ data: Asset }>(`/assets/${id}`);
    return response.data.data;
  },

  async createAsset(dto: CreateAssetDto): Promise<Asset> {
    const response = await api.post<{ success: boolean; data: Asset }>('/assets', dto);
    return response.data.data;
  },

  async updateAsset(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const response = await api.patch<{ success: boolean; data: Asset }>(`/assets/${id}`, dto);
    return response.data.data;
  },

  async deleteAsset(id: string): Promise<boolean> {
    const response = await api.delete<{ success: boolean }>(`/assets/${id}`);
    return response.data.success;
  },

  async toggleFavorite(id: string): Promise<FavoriteResponse> {
    const response = await api.post<FavoriteResponse>(`/assets/${id}/favorite`);
    return response.data;
  },

  async uploadModel(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('model', file);

    const response = await api.post<{
      success: boolean;
      url: string;
      filename: string;
    }>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      url: response.data.url,
      filename: response.data.filename,
    };
  },

  async getTags(): Promise<string[]> {
    const response = await api.get<{ tags: string[] }>('/tags');
    return response.data.tags;
  },
};

export default api;
