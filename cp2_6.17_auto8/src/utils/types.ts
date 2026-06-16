export interface TeamMember {
  id: string;
  name: string;
  avatarInitial: string;
  avatarColor: string;
  prCount: number;
  issueCount: number;
  likes: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: TaskStatus;
  assigneeId: string | null;
  createdAt: string;
}
