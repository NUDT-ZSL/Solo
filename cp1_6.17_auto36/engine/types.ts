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
