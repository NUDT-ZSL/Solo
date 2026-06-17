import type { Activity, Registration, Photo, RegisterData, Child } from './types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        ...options.headers,
      },
      ...options,
    });
    return handleResponse<T>(response);
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export const api = {
  getActivities: (): Promise<Activity[]> =>
    request<Activity[]>('/activities'),

  getActivity: (id: string): Promise<Activity> =>
    request<Activity>(`/activities/${id}`),

  createActivity: (formData: FormData): Promise<Activity> =>
    request<Activity>('/activities', {
      method: 'POST',
      body: formData,
    }),

  register: (activityId: string, data: RegisterData): Promise<Registration> =>
    request<Registration>(`/activities/${activityId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  getRegistrations: (activityId: string): Promise<Registration[]> =>
    request<Registration[]>(`/activities/${activityId}/registrations`),

  updateCheckin: (activityId: string, registrationId: string, checkedIn: boolean): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/activities/${activityId}/checkin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registrationId, checkedIn }),
    }),

  uploadPhotos: (activityId: string, files: File[], onProgress?: (percent: number) => void): Promise<Photo[]> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      files.forEach(file => formData.append('photos', file));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/activities/${activityId}/photos`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(xhr.responseText || `HTTP error! status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  },

  getPhotos: (activityId: string): Promise<Photo[]> =>
    request<Photo[]>(`/activities/${activityId}/photos`),

  toggleFavorite: (activityId: string, photoId: string, isFavorite: boolean): Promise<Photo> =>
    request<Photo>(`/activities/${activityId}/photos/${photoId}/favorite`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isFavorite }),
    }),

  searchActivities: (params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    ageGroup?: string;
  }): Promise<Activity[]> => {
    const query = new URLSearchParams();
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.ageGroup) query.append('ageGroup', params.ageGroup);
    return request<Activity[]>(`/activities/search?${query.toString()}`);
  },

  exportRegistrations: (activityId: string): void => {
    const link = document.createElement('a');
    link.href = `${API_BASE}/activities/${activityId}/registrations/export`;
    link.download = `registrations-${activityId}.csv`;
    link.click();
  },
};

export type { Child };
