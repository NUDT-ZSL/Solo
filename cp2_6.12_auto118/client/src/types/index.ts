export interface Work {
  id: string;
  name: string;
  description: string;
  price: number;
  category: '钱包' | '皮带' | '背包' | '小物';
  image: string;
  stock: number;
  created_at: string;
}

export interface CartItem {
  work: Work;
  quantity: number;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  image: string;
}

export interface CourseSlot {
  id: string;
  course_id: string;
  date: string;
  time: string;
  max_capacity: number;
  booked_count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WorksResponse {
  works: Work[];
  total: number;
  page: number;
  pageSize: number;
}
