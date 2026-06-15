export interface Course {
  id: string;
  name: string;
  category: string;
  estimatedHours: number;
  difficulty: string;
  createdAt: Date;
  totalMinutes?: number;
  progress?: number;
}

export interface StudyRecord {
  id: string;
  courseId: string;
  duration: number;
  date: Date;
  createdAt: Date;
}

export interface RecommendStep {
  courseId: string;
  reason: string;
  priority: number;
  course?: Course;
}

export interface FilterOptions {
  category: string;
  difficulty: string;
  status: string;
}
