export type Difficulty = '初级' | '中级' | '高级';
export type UserRole = 'student' | 'teacher';

export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  createdAt: string;
}

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
  curvature: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  assessments?: Record<string, Record<string, number>>;
  reviewedNodes?: Record<string, string[]>;
}

export interface RecommendPathRequest {
  userId: string;
  courseId: string;
}
