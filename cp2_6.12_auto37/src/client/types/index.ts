export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  author: string;
  difficulty: number;
  createdAt: number;
}

export interface Task {
  id: string;
  name: string;
  assignee: string | null;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Activity {
  id: string;
  recipeId: string;
  name: string;
  host: string;
  tasks: Task[];
  maxParticipants: number;
  startTime: number | null;
  status: string;
  participants: string[];
  createdAt: number;
}
