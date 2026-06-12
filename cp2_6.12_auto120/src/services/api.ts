import axios from 'axios';

export interface Capsule {
  id: number;
  lat: number;
  lng: number;
  message: string;
  image_url: string | null;
  unlock_time: string;
  created_at: string;
  is_unlocked: boolean;
}

export interface Reply {
  id: number;
  capsule_id: number;
  content: string;
  created_at: string;
}

export interface CapsulePayload {
  lat: number;
  lng: number;
  message: string;
  unlock_time: string;
  image?: File;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const capsuleApi = {
  getAll: async (): Promise<Capsule[]> => {
    const res = await api.get('/capsules');
    return res.data;
  },

  getById: async (id: number): Promise<Capsule> => {
    const res = await api.get(`/capsules/${id}`);
    return res.data;
  },

  create: async (payload: CapsulePayload): Promise<Capsule> => {
    const formData = new FormData();
    formData.append('lat', String(payload.lat));
    formData.append('lng', String(payload.lng));
    formData.append('message', payload.message);
    formData.append('unlock_time', payload.unlock_time);
    if (payload.image) {
      formData.append('image', payload.image);
    }
    const res = await api.post('/capsules', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getNearby: async (lat: number, lng: number, radius: number = 5000): Promise<Capsule[]> => {
    const res = await api.get('/capsules/nearby', {
      params: { lat, lng, radius },
    });
    return res.data;
  },
};

export const replyApi = {
  getByCapsuleId: async (capsuleId: number): Promise<Reply[]> => {
    const res = await api.get(`/capsules/${capsuleId}/replies`);
    return res.data;
  },

  create: async (capsuleId: number, content: string): Promise<Reply> => {
    const res = await api.post(`/capsules/${capsuleId}/replies`, { content });
    return res.data;
  },

  delete: async (capsuleId: number, replyId: number): Promise<void> => {
    await api.delete(`/capsules/${capsuleId}/replies/${replyId}`);
  },
};

export const uploadApi = {
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
