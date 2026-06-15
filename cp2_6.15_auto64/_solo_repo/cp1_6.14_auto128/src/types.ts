export interface User {
  id: string;
  email: string;
  password: string;
  nickname: string;
  role: 'student' | 'teacher';
}

export interface Submission {
  id: string;
  userId: string;
  userNickname: string;
  classId: string;
  assignmentId: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

export interface Review {
  id: string;
  submissionId: string;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SubmissionWithStats extends Submission {
  avgRating: number;
  reviewCount: number;
  rank?: number;
}

export interface DeadlineConfig {
  classId: string;
  assignmentId: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}
