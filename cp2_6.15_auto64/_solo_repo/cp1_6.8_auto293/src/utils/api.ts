export interface InvitedFriend {
  id: string;
  email: string;
  name: string;
  avatar: string;
  status: 'pending' | 'accepted';
}

export interface Capsule {
  id: string;
  year: number;
  title: string;
  events: string[];
  mood: string;
  photos: string[];
  unlockYear: number;
  createdAt: string;
  isPublic: boolean;
  shareId?: string;
  invitedFriends: InvitedFriend[];
}

export interface CapsuleResponse {
  capsule: Capsule;
  isUnlocked: boolean;
  countdown: {
    years: number;
    months: number;
    days: number;
    progress: number;
  };
}

export interface CreateCapsuleRequest {
  year: number;
  title: string;
  events: string[];
  mood: string;
  photos: string[];
  unlockYear: number;
  isPublic: boolean;
}

const BASE_URL = '/api/capsules';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function fetchCapsules(): Promise<CapsuleResponse[]> {
  return request<CapsuleResponse[]>(BASE_URL);
}

export function fetchCapsuleById(id: string): Promise<CapsuleResponse> {
  return request<CapsuleResponse>(`${BASE_URL}/${id}`);
}

export function createCapsule(data: CreateCapsuleRequest): Promise<CapsuleResponse> {
  return request<CapsuleResponse>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCapsule(id: string, data: Partial<CreateCapsuleRequest>): Promise<CapsuleResponse> {
  return request<CapsuleResponse>(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteCapsule(id: string): Promise<void> {
  return request<void>(`${BASE_URL}/${id}`, { method: 'DELETE' });
}

export function inviteFriend(capsuleId: string, email: string): Promise<InvitedFriend> {
  return request<InvitedFriend>(`${BASE_URL}/${capsuleId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function generateShareLink(capsuleId: string): Promise<{ shareId: string }> {
  return request<{ shareId: string }>(`${BASE_URL}/${capsuleId}/share`, {
    method: 'POST',
  });
}

export function fetchSharedCapsule(shareId: string): Promise<CapsuleResponse> {
  return request<CapsuleResponse>(`${BASE_URL}/shared/${shareId}`);
}

export function uploadPhoto(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('photo', file);
  return fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  }).then((res) => {
    if (!res.ok) throw new Error(`Upload Error: ${res.status}`);
    return res.json();
  });
}
