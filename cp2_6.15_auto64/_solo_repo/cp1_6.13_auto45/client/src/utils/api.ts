import axios from 'axios';

export interface Podcast {
  _id: string;
  title: string;
  filename: string;
  originalName: string;
  filePath: string;
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
  codec: string;
  tags: string[];
  waveform: number[];
  createdAt: string;
  updatedAt: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const podcastApi = {
  getAll: async (): Promise<Podcast[]> => {
    const response = await api.get('/podcasts');
    return response.data;
  },

  getById: async (id: string): Promise<Podcast> => {
    const response = await api.get(`/podcast/${id}`);
    return response.data;
  },

  search: async (tags?: string, startDate?: string, endDate?: string): Promise<Podcast[]> => {
    const params: any = {};
    if (tags) params.tags = tags;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/podcasts/search', { params });
    return response.data;
  },

  upload: async (files: File[], onProgress?: (index: number, progress: number) => void): Promise<Podcast[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.podcasts;
  },

  updateTags: async (id: string, tags: string[]): Promise<Podcast> => {
    const response = await api.put(`/podcast/${id}/tags`, { tags });
    return response.data;
  }
};

export default api;
