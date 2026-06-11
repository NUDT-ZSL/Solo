export interface CelebrationRecord {
  id: string;
  timestamp: number;
  progressIncrease: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  deadline: string;
  progress: number;
  createdAt: number;
  celebrations: CelebrationRecord[];
  celebrationCount: number;
  lastCelebrationDate: string | null;
}

export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  deadline: string;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
}

export interface CelebrateResponse {
  success: boolean;
  newProgress: number;
  message?: string;
}

export interface FormErrors {
  title?: string;
  description?: string;
  deadline?: string;
}
