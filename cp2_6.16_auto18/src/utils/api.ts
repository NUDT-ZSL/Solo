import type {
  Plant,
  CareEvent,
  GrowthRecord,
  Reminder,
  IdentifyResult,
} from '../types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api${url}`, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    return {
      success: false,
      error: 'Network error',
    };
  }
}

export const api = {
  identify: {
    byImage: (file: File, description?: string) => {
      const formData = new FormData();
      formData.append('image', file);
      if (description) {
        formData.append('description', description);
      }
      return request<{ results: IdentifyResult[]; uploadedImage?: string }>('/identify', {
        method: 'POST',
        body: formData,
      });
    },
    byDescription: (description: string) => {
      const formData = new FormData();
      formData.append('description', description);
      return request<{ results: IdentifyResult[] }>('/identify', {
        method: 'POST',
        body: formData,
      });
    },
  },

  plants: {
    getAll: () => request<{ plants: Plant[] }>('/plants'),
    getById: (id: string) => request<{ plant: Plant }>(`/plants/${id}`),
    create: (data: {
      plantId?: string;
      name?: string;
      scientificName?: string;
      image?: string;
      description?: string;
      light?: string;
      water?: string;
      temperature?: string;
      soil?: string;
      location?: string;
    }) =>
      request<{ plant: Plant }>('/plants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: {
        name: string;
        scientificName: string;
        image: string;
        description: string;
        light: string;
        water: string;
        temperature: string;
        soil: string;
        location: string;
      }
    ) =>
      request(`/plants/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/plants/${id}`, {
        method: 'DELETE',
      }),
  },

  events: {
    getByPlant: (plantId: string) =>
      request<{ events: CareEvent[] }>(`/events/plant/${plantId}`),
    create: (
      plantId: string,
      data: {
        type: 'water' | 'fertilize' | 'prune' | 'repot';
        date: string;
        note?: string;
      }
    ) =>
      request<{ event: CareEvent }>(`/events/plant/${plantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: {
        type: 'water' | 'fertilize' | 'prune' | 'repot';
        date: string;
        note?: string;
      }
    ) =>
      request<{ event: CareEvent }>(`/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/events/${id}`, {
        method: 'DELETE',
      }),
  },

  records: {
    getByPlant: (plantId: string) =>
      request<{ records: GrowthRecord[] }>(`/records/plant/${plantId}`),
    create: (
      plantId: string,
      data: {
        date: string;
        note: string;
        image?: File;
      }
    ) => {
      const formData = new FormData();
      formData.append('date', data.date);
      formData.append('note', data.note);
      if (data.image) {
        formData.append('image', data.image);
      }
      return request<{ record: GrowthRecord }>(`/records/plant/${plantId}`, {
        method: 'POST',
        body: formData,
      });
    },
    delete: (id: string) =>
      request(`/records/${id}`, {
        method: 'DELETE',
      }),
  },

  reminders: {
    getAll: () => request<{ reminders: Reminder[] }>('/reminders'),
    complete: (id: string) =>
      request(`/reminders/${id}/complete`, {
        method: 'POST',
      }),
  },
};

export default api;
