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
}

export interface Relation {
  id: string;
  courseId: string;
  sourceId: string;
  targetId: string;
  curve: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface AssessmentScore {
  id: string;
  userId: string;
  knowledgePointId: string;
  score: number;
}

export interface ReviewedNode {
  id: string;
  userId: string;
  knowledgePointId: string;
  reviewedAt: string;
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  初级: '#81c784',
  中级: '#ffb74d',
  高级: '#e57373',
};
