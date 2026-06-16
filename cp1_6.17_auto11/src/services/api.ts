import type {
  Trip,
  Attraction,
  CheckInRecord,
  WeatherInfo,
  User,
} from '../types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const authApi = {
  login: (username: string, password: string) =>
    request<{ success: boolean; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    request<{ success: boolean; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

export const tripApi = {
  getTrips: (userId: string) =>
    request<{ trips: Trip[] }>(`/trips?userId=${userId}`),

  getTrip: (id: string) =>
    request<{ trip: Trip }>(`/trips/${id}`),

  createTrip: (userId: string, tripData: Partial<Trip>) =>
    request<{ trip: Trip }>('/trips', {
      method: 'POST',
      body: JSON.stringify({ userId, ...tripData }),
    }),

  updateTrip: (id: string, updates: Partial<Trip>) =>
    request<{ trip: Trip }>(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteTrip: (id: string) =>
    request<{ success: boolean }>(`/trips/${id}`, {
      method: 'DELETE',
    }),
};

export const attractionApi = {
  search: (query: string = '') =>
    request<{ attractions: Attraction[] }>(`/attractions?q=${encodeURIComponent(query)}`),

  getById: (id: string) =>
    request<{ attraction: Attraction }>(`/attractions/${id}`),
};

export const checkInApi = {
  getByTripId: (tripId: string) =>
    request<{ checkIns: CheckInRecord[] }>(`/trips/${tripId}/checkins`),

  create: (tripId: string, checkIn: Omit<CheckInRecord, 'id'>) =>
    request<{ checkIn: CheckInRecord }>(`/trips/${tripId}/checkins`, {
      method: 'POST',
      body: JSON.stringify(checkIn),
    }),
};

export const weatherApi = {
  getByCity: (city: string) =>
    request<{ weather: WeatherInfo[]; city: string }>(
      `/weather?city=${encodeURIComponent(city)}`
    ),
};

export const photoApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return request<{ url: string; filename: string; size: number }>(
      '/photos/upload',
      {
        method: 'POST',
        body: formData,
        headers: {},
      }
    );
  },

  uploadBatch: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    return request<{ urls: string[] }>('/photos/batch', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },
};

export const shareApi = {
  create: (tripId: string) =>
    request<{ shareUrl: string; shareToken: string; expiresAt: string }>(
      '/share',
      {
        method: 'POST',
        body: JSON.stringify({ tripId }),
      }
    ),

  get: (token: string) =>
    request<{ trip: Trip }>(`/share/${token}`),
};
