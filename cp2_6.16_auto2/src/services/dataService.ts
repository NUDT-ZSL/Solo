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

const REQUEST_TIMEOUT_MS = 10000;

class ApiError extends Error {
  public status: number | null;
  public isNetworkError: boolean;
  public isTimeout: boolean;

  constructor(message: string, options?: { status?: number; isNetwork?: boolean; isTimeout?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status ?? null;
    this.isNetworkError = options?.isNetwork ?? false;
    this.isTimeout = options?.isTimeout ?? false;
  }
}

const getStatusMessage = (status: number): string => {
  switch (status) {
    case 400:
      return '请求参数错误，请检查输入';
    case 401:
      return '未授权，请重新登录';
    case 403:
      return '没有权限访问此资源';
    case 404:
      return '数据不存在';
    case 500:
      return '服务器内部错误，请稍后重试';
    case 502:
      return '服务器网关错误，请稍后重试';
    case 503:
      return '服务暂时不可用，请稍后重试';
    default:
      return `请求失败 (HTTP ${status})`;
  }
};

const fetchWithError = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络连接后重试', { isTimeout: true });
    }

    if (err instanceof TypeError) {
      throw new ApiError('网络连接失败，请检查网络设置', { isNetwork: true });
    }

    throw new ApiError(
      err instanceof Error ? err.message : '未知网络错误',
      { isNetwork: true },
    );
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const status = response.status;
    const message = getStatusMessage(status);
    throw new ApiError(message, { status });
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('服务器返回的数据格式异常');
  }
};

export const getAllPhotos = async (): Promise<Photo[]> => {
  return fetchWithError<Photo[]>('/api/photos');
};

export const getPhotoByDate = async (date: string): Promise<Photo> => {
  return fetchWithError<Photo>(`/api/photos/${date}`);
};

export { ApiError };
