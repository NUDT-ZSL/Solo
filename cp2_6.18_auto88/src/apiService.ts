export interface PlantData {
  id: string;
  name: string;
  lightPreference: 'sunny' | 'shady' | 'neutral';
  defaultHeight: number;
  color: string;
  modelType: string;
}

export interface WateringRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface GardenPlant {
  id: string;
  plantId: string;
  position: { x: number; y: number; z: number };
  potColor: string;
  addedDate: string;
  currentHeight: number;
  wateringRecords: WateringRecord[];
}

function showToast(message: string): void {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    height: '40px',
    lineHeight: '40px',
    textAlign: 'center',
    borderRadius: '8px',
    backgroundColor: '#323232',
    color: '#fff',
    fontSize: '14px',
    zIndex: '10000',
    opacity: '0',
    transition: 'opacity 0.3s ease-in-out'
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    showToast('操作失败，请稍后重试');
    return null;
  }
}

export const apiService = {
  async getPlants(): Promise<PlantData[]> {
    const result = await request<PlantData[]>('/api/plants');
    return result || [];
  },

  async getGarden(): Promise<GardenPlant[]> {
    const result = await request<GardenPlant[]>('/api/garden');
    return result || [];
  },

  async addPlant(plantId: string, position: { x: number; y: number; z: number }, potColor: string): Promise<GardenPlant | null> {
    return await request<GardenPlant>('/api/garden', {
      method: 'POST',
      body: JSON.stringify({ plantId, position, potColor })
    });
  },

  async deletePlant(id: string): Promise<boolean> {
    const result = await request<{ success: boolean }>(`/api/garden/${id}`, {
      method: 'DELETE'
    });
    return result?.success || false;
  },

  async recordWatering(plantId: string, amount: number, note: string): Promise<WateringRecord | null> {
    return await request<WateringRecord>('/api/watering', {
      method: 'POST',
      body: JSON.stringify({ plantId, amount, note })
    });
  }
};
