import type { MusicRecord, Scene, CreateRecordData, FilterParams } from '../types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `请求失败: ${response.status}`);
  }
  return response.json();
}

export async function getRecords(params?: FilterParams): Promise<MusicRecord[]> {
  const queryParams = new URLSearchParams();

  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.tags && params.tags.length > 0) {
    queryParams.append('tags', params.tags.join(','));
  }
  if (params?.rating) {
    queryParams.append('rating', params.rating.toString());
  }
  if (params?.timePeriod && params.timePeriod !== 'all') {
    queryParams.append('timePeriod', params.timePeriod);
  }

  const queryString = queryParams.toString();
  const url = `${API_BASE}/records${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url);
    return handleResponse<MusicRecord[]>(response);
  } catch (error) {
    console.error('获取记录失败:', error);
    throw error;
  }
}

export async function createRecord(data: CreateRecordData): Promise<MusicRecord> {
  const formData = new FormData();
  formData.append('songName', data.songName);
  formData.append('artist', data.artist);
  formData.append('scene', data.scene);
  formData.append('rating', data.rating.toString());
  formData.append('tags', JSON.stringify(data.tags));

  if (data.image) {
    formData.append('image', data.image);
  }

  try {
    const response = await fetch(`${API_BASE}/records`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<MusicRecord>(response);
  } catch (error) {
    console.error('创建记录失败:', error);
    throw error;
  }
}

export async function deleteRecord(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/records/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  } catch (error) {
    console.error('删除记录失败:', error);
    throw error;
  }
}

export async function getScenes(): Promise<Scene[]> {
  try {
    const response = await fetch(`${API_BASE}/scenes`);
    return handleResponse<Scene[]>(response);
  } catch (error) {
    console.error('获取情境列表失败:', error);
    throw error;
  }
}
