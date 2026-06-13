export interface Project {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  status: 'ongoing' | 'completed';
  creatorId: string;
  createdAt: string;
  coverImage?: string;
  endDate?: string;
}

export interface Support {
  id: string;
  projectId: string;
  supporterName: string;
  amount: number;
  message: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface ThankYouLetter {
  projectId: string;
  projectTitle: string;
  totalAmount: number;
  supporterCount: number;
  supporters: Array<{
    name: string;
    amount: number;
    message: string;
  }>;
  ranking: Array<{
    name: string;
    amount: number;
    rank: number;
  }>;
  generatedAt: string;
}
