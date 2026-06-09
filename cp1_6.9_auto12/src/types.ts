export interface CapsuleListItem {
  id: string;
  title: string;
  unlockTime: number;
  createdAt: number;
  isUnlocked: boolean;
  shareUrl: string;
}

export interface CapsuleDetail {
  id: string;
  title: string;
  content?: string;
  image?: string;
  audio?: string;
  unlockTime: number;
  createdAt: number;
  isUnlocked: boolean;
  shareUrl: string;
}

export interface CreateCapsuleRequest {
  title: string;
  content: string;
  image?: string;
  audio?: string;
  unlockTime: number;
}

export interface CreateCapsuleResponse {
  id: string;
  shareUrl: string;
  unlockTime: number;
}

export interface CapsuleListResponse {
  capsules: CapsuleListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export type FilterStatus = 'all' | 'locked' | 'unlocked';
