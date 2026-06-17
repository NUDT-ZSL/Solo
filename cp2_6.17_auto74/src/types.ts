export type ToolStatus = 'available' | 'borrowed' | 'repairing';

export interface Tool {
  id: string;
  name: string;
  category: string;
  photo: string;
  status: ToolStatus;
  description: string;
  usageInstructions: string;
  createdAt: string;
}

export interface BorrowRecord {
  id: string;
  toolId: string;
  toolName: string;
  toolPhoto: string;
  userName: string;
  userId: string;
  durationHours: number;
  startTime: string;
  endTime: string;
  status: 'active' | 'returned' | 'overdue';
  feedback?: {
    condition: 'normal' | 'wear' | 'damaged';
    comment: string;
    submittedAt: string;
  };
}

export interface RepairOrder {
  id: string;
  toolId: string;
  toolName: string;
  reporterId: string;
  reporterName: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'resolved';
  resolvedAt?: string;
}

export const CURRENT_USER = {
  id: 'user-001',
  name: '张三',
};
