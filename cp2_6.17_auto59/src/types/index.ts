export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  role: 'manager' | 'member';
}

export interface ReportContent {
  done: string;
  plan: string;
  blocker: string;
}

export interface Report {
  id: string;
  userId: string;
  type: 'daily' | 'weekly';
  content: ReportContent;
  blockerType: string;
  likes: number;
  rating: number;
  createdAt: string;
  user: User;
}

export interface ReportsListResponse {
  data: Report[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface BarChartItem {
  userId: string;
  name: string;
  count: number;
  color: string;
}

export interface PieChartItem {
  name: string;
  value: number;
  fill: string;
}

export interface StatsResponse {
  barChartData: BarChartItem[];
  pieChartData: PieChartItem[];
  totalReports: number;
  totalUsers: number;
  dateRange: { startDate?: string; endDate?: string };
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}
