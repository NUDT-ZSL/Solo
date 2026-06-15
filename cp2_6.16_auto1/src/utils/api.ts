import type {
  Book,
  DiaryRecord,
  DailyStats,
  Recommendation,
  ApiResponse,
} from '../types';

const API_BASE = '/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const fetchBooks = async (): Promise<Book[]> => {
  const response = await fetch(`${API_BASE}/books`);
  const data = await handleResponse<ApiResponse<{ books: Book[] }>>(response);
  return data.data?.books || [];
};

export const fetchDiaryRecords = async (): Promise<DiaryRecord[]> => {
  const response = await fetch(`${API_BASE}/diary`);
  const data = await handleResponse<ApiResponse<{ records: DiaryRecord[] }>>(response);
  return data.data?.records || [];
};

export const createDiaryRecord = async (record: Omit<DiaryRecord, 'id' | 'date' | 'createdAt'>): Promise<DiaryRecord> => {
  const response = await fetch(`${API_BASE}/diary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  const data = await handleResponse<ApiResponse<{ record: DiaryRecord }>>(response);
  if (!data.data?.record) {
    throw new Error('Failed to create record');
  }
  return data.data.record;
};

export const updateDiaryRecord = async (
  id: number,
  record: Omit<DiaryRecord, 'id' | 'date' | 'createdAt'>
): Promise<DiaryRecord> => {
  const response = await fetch(`${API_BASE}/diary/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  const data = await handleResponse<ApiResponse<{ record: DiaryRecord }>>(response);
  if (!data.data?.record) {
    throw new Error('Failed to update record');
  }
  return data.data.record;
};

export const fetchStats = async (): Promise<DailyStats[]> => {
  const response = await fetch(`${API_BASE}/diary/stats`);
  const data = await handleResponse<ApiResponse<{ stats: DailyStats[] }>>(response);
  return data.data?.stats || [];
};

export const fetchRecommendation = async (): Promise<Recommendation> => {
  const response = await fetch(`${API_BASE}/diary/recommendation`);
  const data = await handleResponse<Recommendation>(response);
  return data;
};

export const clearAllRecords = async (): Promise<void> => {
  const response = await fetch(`${API_BASE}/diary/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  await handleResponse<ApiResponse<void>>(response);
};
