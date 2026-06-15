export type FlowType = 'leave' | 'expense' | 'business';

export type FlowStatus = 'pending' | 'approved' | 'rejected';

export type NodeStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface LeaveForm {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  days: number;
}

export interface ExpenseForm {
  amount: number;
  category: string;
  description: string;
  date: string;
  attachments?: string[];
}

export interface BusinessForm {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  budget: number;
}

export interface FlowNode {
  id: string;
  name: string;
  role: string;
  status: NodeStatus;
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  comment?: string;
}

export interface FlowInstance {
  id: string;
  type: FlowType;
  title: string;
  applicantId: string;
  applicantName: string;
  status: FlowStatus;
  formData: LeaveForm | ExpenseForm | BusinessForm;
  nodes: FlowNode[];
  currentNodeIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface User {
  userId: string;
  userName: string;
  avatar?: string;
  role?: string;
}

export interface TodoItem {
  flowId: string;
  title: string;
  type: FlowType;
  applicantName: string;
  nodeName: string;
  createdAt: string;
}
