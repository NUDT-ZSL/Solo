const BASE_URL = '/api';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
};

export const authApi = {
  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, nickname: string, password: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, nickname, password }),
    }),
};

export const cardsApi = {
  getAll: () => request('/cards'),

  getById: (id: number) => request(`/cards/${id}`),

  create: (templateId: number, elements: any[], effects: any) =>
    request('/cards', {
      method: 'POST',
      body: JSON.stringify({ templateId, elements, effects }),
    }),

  update: (id: number, templateId: number, elements: any[], effects: any) =>
    request(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ templateId, elements, effects }),
    }),

  delete: (id: number) =>
    request(`/cards/${id}`, {
      method: 'DELETE',
    }),
};

export const favoritesApi = {
  getAll: () => request('/favorites'),

  add: (cardId: number) =>
    request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ cardId }),
    }),

  remove: (id: number) =>
    request(`/favorites/${id}`, {
      method: 'DELETE',
    }),
};

export const sendsApi = {
  create: (cardId: number, receiverEmail: string) =>
    request('/sends', {
      method: 'POST',
      body: JSON.stringify({ cardId, receiverEmail }),
    }),

  getByToken: (token: string) => request(`/sends/${token}`),
};

export const contactsApi = {
  getAll: () => request('/contacts'),
};
