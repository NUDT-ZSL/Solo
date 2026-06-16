export type CardStatus = 'discussion' | 'scheduling' | 'confirmed' | 'in_progress' | 'completed';

export type CardTag = 'feature' | 'tech' | 'design' | 'ops';

export interface Card {
  id: string;
  title: string;
  description: string;
  estimateDays: number;
  dependencyId?: string | null;
  tag: CardTag;
  assignee: string;
  status: CardStatus;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  lastStatusChange: string;
}

export interface Vote {
  cardId: string;
  userId: string;
  score: number;
  userRole?: string;
}

export interface VoteResult {
  cardId: string;
  weightedScore: number;
  totalVotes: number;
  rank: number;
}

export interface RiskAlert {
  cardId: string;
  cardTitle: string;
  dependencyId?: string;
  dependencyTitle?: string;
  reason: string;
  level: 'high' | 'medium' | 'low';
  assignee: string;
  projectId: string;
  card?: Card;
  dependency?: Card;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface WorkloadItem {
  memberId: string;
  memberName: string;
  totalEstimate: number;
  completedEstimate: number;
  cards: Card[];
}

export interface ProgressStats {
  total: number;
  completed: number;
  inProgress: number;
  confirmed: number;
  percentage: number;
}

export const COLUMN_LABELS: Record<CardStatus, string> = {
  discussion: '待讨论',
  scheduling: '排期中',
  confirmed: '已确认',
  in_progress: '进行中',
  completed: '已完成'
};

export const TAG_COLORS: Record<CardTag, string> = {
  feature: '#4CAF50',
  tech: '#2196F3',
  design: '#9C27B0',
  ops: '#FF5722'
};

export const TAG_LABELS: Record<CardTag, string> = {
  feature: '功能',
  tech: '技术',
  design: '设计',
  ops: '运维'
};
