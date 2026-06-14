export type PetStatus = 'pending' | 'reviewing' | 'adopted';

export const StatusLabels: Record<PetStatus, string> = {
  pending: '待审核',
  reviewing: '审核中',
  adopted: '已领养',
};

export const StatusColors: Record<PetStatus, { bg: string; text: string }> = {
  pending: { bg: '#fff3cd', text: '#856404' },
  reviewing: { bg: '#cce5ff', text: '#004085' },
  adopted: { bg: '#d4edda', text: '#155724' },
};

export interface AdoptionRecord {
  id: string;
  applicantName: string;
  date: string;
  status: PetStatus;
  notes?: string;
}

export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  description: string;
  healthNotes?: string;
  photos: string[];
  status: PetStatus;
  createdAt: string;
  adoptionHistory: AdoptionRecord[];
}

export interface AdoptionApplication {
  id: string;
  petId: string;
  petName: string;
  applicantName: string;
  applicationDate: string;
  status: PetStatus;
}

export interface PetListResponse {
  data: Pet[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface PetFormData {
  name: string;
  breed: string;
  age: number;
  description: string;
  healthNotes?: string;
  photos: string[];
  status: PetStatus;
}
