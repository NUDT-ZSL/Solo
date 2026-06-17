export type Difficulty = '初级' | '中级' | '高级';

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

export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  teacherId: string;
}

export interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
}

export interface UserScore {
  userId: string;
  knowledgePointId: string;
  score: number;
  reviewed: boolean;
}

export interface ReviewPathResult {
  path: string[];
  weakPoints: string[];
}
