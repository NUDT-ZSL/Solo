export interface Tool {
  id: string;
  name: string;
  image: string;
  description: string;
  instructions: string;
  status: 'available' | 'borrowed' | 'repairing';
}

export interface Borrow {
  id: string;
  toolId: string;
  toolName: string;
  memberName: string;
  duration: number;
  startTime: string;
  endTime: string;
  status: 'active' | 'returned' | 'overdue';
  feedback?: {
    condition: 'normal' | 'worn' | 'damaged';
    comment: string;
    timestamp: string;
  };
}

export interface Repair {
  id: string;
  toolId: string;
  toolName: string;
  reporter: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'fixed';
}

export type ToolStatus = Tool['status'];
export type BorrowStatus = Borrow['status'];
export type RepairStatus = Repair['status'];
export type FeedbackCondition = 'normal' | 'worn' | 'damaged';
