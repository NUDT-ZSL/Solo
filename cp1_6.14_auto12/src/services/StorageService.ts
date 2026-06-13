import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

export interface SavedConfig {
  _id?: string;
  name?: string;
  nodes: unknown[];
  transitions: unknown[];
  createdAt?: string;
}

export const StorageService = {
  async saveConfig(config: SavedConfig): Promise<SavedConfig> {
    const res = await api.post('/config', config);
    return res.data;
  },

  async loadConfig(id: string): Promise<SavedConfig> {
    const res = await api.get(`/config/${id}`);
    return res.data;
  },

  async listPresets(): Promise<unknown[]> {
    try {
      const res = await api.get('/presets');
      return res.data;
    } catch {
      return [];
    }
  },

  async listConfigs(): Promise<SavedConfig[]> {
    const res = await api.get('/configs');
    return res.data;
  },

  async deleteConfig(id: string): Promise<void> {
    await api.delete(`/config/${id}`);
  },
};
