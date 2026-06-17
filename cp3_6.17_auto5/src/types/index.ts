export type Difficulty = '初级' | '中级' | '高级';
export type UserRole = 'teacher' | 'student';

export interface KnowledgePoint {
  id: string;
  courseId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  x: number;
  y: number;
  createdAt: number;
}

export interface KnowledgeRelation {
  id: string;
  courseId: string;
  sourceId: string;
  targetId: string;
  curvature: number;
  createdAt: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  teacherId: string;
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: number;
}

export interface Assessment {
  id: string;
  userId: string;
  courseId: string;
  pointId: string;
  score: number;
  completedAt: number;
}

export interface ReviewRecord {
  id: string;
  userId: string;
  pointId: string;
  reviewedAt: number;
}

export interface RecommendPathRequest {
  userId: string;
  courseId: string;
  maxNodes?: number;
}

export interface RecommendPathResponse {
  path: string[];
}
