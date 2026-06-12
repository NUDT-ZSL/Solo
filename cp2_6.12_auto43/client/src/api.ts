import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export interface ArtifactData {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  position_x: number;
  position_z: number;
}

export interface ExhibitionData {
  id: string;
  name: string;
  description: string;
  theme_color: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  cover_image: string | null;
  artifact_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExhibitionDetail extends ExhibitionData {
  artifacts: ArtifactData[];
}

export interface CommentData {
  id: string;
  exhibition_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: string;
}

export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getExhibitions = async (tag?: string): Promise<ExhibitionData[]> => {
  const params = tag ? { tag } : {};
  const res = await api.get('/exhibitions', { params });
  return res.data;
};

export const getMyExhibitions = async (): Promise<ExhibitionData[]> => {
  const res = await api.get('/exhibitions/mine');
  return res.data;
};

export const getExhibitionDetail = async (id: string): Promise<ExhibitionDetail> => {
  const res = await api.get(`/exhibitions/${id}`);
  return res.data;
};

export const createExhibition = async (data: {
  name: string;
  description: string;
  theme_color: string;
  tags: string[];
  status: string;
  cover_image: string | null;
  artifacts: ArtifactData[];
}): Promise<{ id: string }> => {
  const res = await api.post('/exhibitions', data);
  return res.data;
};

export const updateExhibition = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    theme_color: string;
    tags: string[];
    status: string;
    cover_image: string | null;
    artifacts: ArtifactData[];
  }>
): Promise<{ id: string }> => {
  const res = await api.put(`/exhibitions/${id}`, data);
  return res.data;
};

export const deleteExhibition = async (id: string): Promise<void> => {
  await api.delete(`/exhibitions/${id}`);
};

export const updateExhibitionStatus = async (
  id: string,
  status: 'draft' | 'published' | 'archived'
): Promise<void> => {
  await api.patch(`/exhibitions/${id}/status`, { status });
};

export const getComments = async (exhibitionId: string): Promise<CommentData[]> => {
  const res = await api.get(`/exhibitions/${exhibitionId}/comments`);
  return res.data;
};

export const addComment = async (
  exhibitionId: string,
  content: string
): Promise<CommentData> => {
  const res = await api.post(`/exhibitions/${exhibitionId}/comments`, { content });
  return res.data;
};

export const getFavorites = async (): Promise<ExhibitionData[]> => {
  const res = await api.get('/favorites');
  return res.data;
};

export const checkFavorite = async (exhibitionId: string): Promise<{ favorited: boolean }> => {
  const res = await api.get(`/favorites/${exhibitionId}`);
  return res.data;
};

export const toggleFavorite = async (
  exhibitionId: string
): Promise<{ favorited: boolean }> => {
  const res = await api.post(`/favorites/${exhibitionId}`);
  return res.data;
};

export const getCurrentUser = async (): Promise<{
  id: string;
  name: string;
  avatar: string;
}> => {
  const res = await api.get('/user/me');
  return res.data;
};

export default api;
