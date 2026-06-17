export interface Plant {
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
  name: string;
  lightPreference: 'sunny' | 'shady' | 'neutral';
  defaultHeight: number;
  currentHeight: number;
  color: string;
  potColor: string;
  position: { x: number; z: number };
  addedDate: string;
  wateringRecords: WateringRecord[];
}

const BASE_URL = '/api';

function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
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
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none'
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
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

export async function getPlants(): Promise<Plant[]> {
  const result = await request<Plant[]>('/plants');
  return result || [];
}

export async function getGarden(): Promise<GardenPlant[]> {
  const result = await request<GardenPlant[]>('/garden');
  return result || [];
}

export async function addPlant(plantId: string, position: { x: number; z: number }, potColor: string): Promise<GardenPlant | null> {
  return await request<GardenPlant>('/garden', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId, position, potColor })
  });
}

export async function deletePlant(id: string): Promise<boolean> {
  const result = await request<{ success: boolean }>(`/garden/${id}`, {
    method: 'DELETE'
  });
  return result?.success || false;
}

export async function recordWatering(plantId: string, amount: number, note: string): Promise<WateringRecord | null> {
  return await request<WateringRecord>('/watering', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId, amount, note })
  });
}
