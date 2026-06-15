export type ContractStage = 'not_started' | 'in_progress' | 'overdue' | 'completed';

export interface Milestone {
  id: string;
  name: string;
  date: string;
  completed: boolean;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  description: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  dataUrl: string;
}

export interface Contract {
  id: string;
  clientName: string;
  amount: number;
  stage: ContractStage;
  startDate: string;
  endDate: string;
  freelancerSignature: string;
  clientSignature: string;
  milestones: Milestone[];
  payments: PaymentRecord[];
  attachments: Attachment[];
  nextPaymentDueDate?: string;
}
