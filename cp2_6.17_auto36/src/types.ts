export interface Project {
  id: string;
  name: string;
  description: string;
  developer: string;
  screenshots: string[];
  demoLink: string;
  progress: number;
  likes: number;
  fundedAmount: number;
  fundingGoal: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  projectId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface FundingRecord {
  id: string;
  projectId: string;
  nickname: string;
  amount: number;
  createdAt: string;
}

export interface LikeRecord {
  fingerprint: string;
  projectId: string;
  lastLikeTime: number;
}
