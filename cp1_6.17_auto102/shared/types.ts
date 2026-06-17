export interface User {
  id: string;
  nickname: string;
  createdAt: string;
  avatarColor: string;
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  createdAt: string;
}

export interface Registration {
  id: string;
  activityId: string;
  userId: string;
  registeredAt: string;
}

export interface Review {
  id: string;
  userId: string;
  activityId: string;
  bookTitle: string;
  content: string;
  rating: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface ActivityWordPoint {
  date: string;
  words: number;
}

export interface UserRank {
  rank: number;
  totalUsers: number;
  percent: number;
  totalWords: number;
}

export interface SummaryStats {
  totalActivities: number;
  totalRegistrations: number;
  avgReviewRating: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ActivityListItem extends Activity {
  registrationCount: number;
}

export interface ActivityDetail extends Activity {
  registrationCount: number;
  registeredUsers: User[];
  reviews: (Review & { user: User })[];
}
