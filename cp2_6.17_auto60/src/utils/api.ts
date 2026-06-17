export interface Pet {
  id: string;
  name: string;
  breed: string;
  birthDate: string;
  avatar: string;
}

export interface HealthRecord {
  id: string;
  petId: string;
  type: 'vaccine' | 'deworm' | 'weight';
  date: string;
  description: string;
  weight?: number;
  temperature?: number;
  vaccineName?: string;
  dewormType?: string;
}

export interface ShareResult {
  token: string;
  shareUrl: string;
  expiresAt: string;
}

export interface ShareProfile {
  pet: Pet;
  records: HealthRecord[];
  vetAdvice?: string;
  expiresAt: string;
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export async function getPets(): Promise<Pet[]> {
  return request<Pet[]>('/pets');
}

export async function addPet(pet: Omit<Pet, 'id'>): Promise<Pet> {
  return request<Pet>('/pets', {
    method: 'POST',
    body: JSON.stringify(pet)
  });
}

export async function updatePet(id: string, pet: Partial<Pet>): Promise<Pet> {
  return request<Pet>(`/pets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(pet)
  });
}

export async function deletePet(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/pets/${id}`, {
    method: 'DELETE'
  });
}

export async function getHealthRecords(petId: string): Promise<HealthRecord[]> {
  return request<HealthRecord[]>(`/records/${petId}`);
}

export async function addHealthRecord(record: Omit<HealthRecord, 'id'>): Promise<HealthRecord> {
  return request<HealthRecord>('/records', {
    method: 'POST',
    body: JSON.stringify(record)
  });
}

export async function shareProfile(petId: string, hospitalEmail: string): Promise<ShareResult> {
  return request<ShareResult>('/share', {
    method: 'POST',
    body: JSON.stringify({ petId, hospitalEmail })
  });
}

export async function getShareProfile(token: string): Promise<ShareProfile> {
  return request<ShareProfile>(`/share/${token}`);
}

export async function addVetAdvice(token: string, advice: string): Promise<{ success: boolean; advice: string }> {
  return request<{ success: boolean; advice: string }>(`/share/${token}/advice`, {
    method: 'POST',
    body: JSON.stringify({ advice })
  });
}
