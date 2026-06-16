export interface Photo {
  id: string;
  date: string;
  imageUrl: string;
  mood: 'happy' | 'calm' | 'sad' | 'angry';
  text: string;
}

export const MOOD_COLORS: Record<Photo['mood'], string> = {
  happy: '#22c55e',
  calm: '#3b82f6',
  sad: '#a855f7',
  angry: '#ef4444',
};

export const MOOD_LABELS: Record<Photo['mood'], string> = {
  happy: '开心',
  calm: '平静',
  sad: '忧伤',
  angry: '生气',
};

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const fetchWithError = async <T>(url: string): Promise<T> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('数据不存在');
      }
      throw new Error(`请求失败: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('网络错误，请稍后重试');
  }
};

export const getAllPhotos = async (): Promise<Photo[]> => {
  return fetchWithError<Photo[]>('/api/photos');
};

export const getPhotoByDate = async (date: string): Promise<Photo> => {
  return fetchWithError<Photo>(`/api/photos/${date}`);
};

export const usePhotosApi = async (): Promise<ApiState<Photo[]>> => {
  try {
    const data = await getAllPhotos();
    return { data, loading: false, error: null };
  } catch (err) {
    return {
      data: null,
      loading: false,
      error: err instanceof Error ? err.message : '加载失败',
    };
  }
};
