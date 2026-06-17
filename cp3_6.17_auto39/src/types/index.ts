export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  createdAt: string;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface KnowledgePoint {
  id: string;
  courseId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  x: number;
  y: number;
}

export interface Relation {
  id: string;
  courseId: string;
  sourceId: string;
  targetId: string;
  controlX?: number;
  controlY?: number;
}

export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface Assessment {
  id: string;
  userId: string;
  courseId: string;
  scores: { pointId: string; score: number }[];
  createdAt: string;
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: '#81c784',
  intermediate: '#ffb74d',
  advanced: '#e57373'
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
};
