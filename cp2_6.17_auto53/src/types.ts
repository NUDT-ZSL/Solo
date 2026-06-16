export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
}

export interface KnowledgePoint {
  id: string;
  courseId: string;
  title: string;
  detail: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  x: number;
  y: number;
}

export interface Relationship {
  id: string;
  courseId: string;
  sourceId: string;
  targetId: string;
  anchorX: number;
  anchorY: number;
}

export interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  courseId: string;
}

export interface Score {
  userId: string;
  knowledgePointId: string;
  score: number;
}
