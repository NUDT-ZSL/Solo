export interface CapsuleRecord {
  id: string;
  createdAt: number;
  releaseAt: number;
}

export interface OpenedCapsule {
  id: string;
  content: string;
  createdAt: number;
  releaseAt: number;
}

export interface CapsuleStatus {
  id: string;
  createdAt: number;
  releaseAt: number;
  isOpened: boolean;
  hasReply: boolean;
  reply?: string;
  replyAt?: number;
}

export type ViewType = 'send' | 'open' | 'history';
