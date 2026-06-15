export interface Course {
  id: string;
  name: string;
  date: string;
  time: string;
  instructor: string;
  capacity: number;
  bookedCount: number;
  price: number;
  status: 'active' | 'cancelled';
  createdAt: string;
}

export interface Booking {
  id: string;
  courseId: string;
  studentName: string;
  phone: string;
  email: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CreateCourseRequest {
  name: string;
  date: string;
  time: string;
  instructor: string;
  capacity?: number;
  price: number;
}

export interface UpdateCourseRequest {
  name?: string;
  date?: string;
  time?: string;
  instructor?: string;
  capacity?: number;
  price?: number;
}

export interface CreateBookingRequest {
  courseId: string;
  studentName: string;
  phone: string;
  email: string;
  notes: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
