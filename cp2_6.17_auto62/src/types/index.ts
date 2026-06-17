export type CourseCategory = '技术类' | '管理类' | '软技能类';

export interface Course {
  id: string;
  name: string;
  category: CourseCategory;
  instructor: string;
  instructorAvatar?: string;
  instructorBio: string;
  duration: number;
  maxSlots: number;
  bookedSlots: number;
  outline: string;
  rating: number;
  ratingCount: number;
  location: string;
  startTime: string;
}

export type BookingStatus = 'pending' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  courseId: string;
  courseName: string;
  employeeName: string;
  status: BookingStatus;
  bookedAt: string;
  rating?: number;
  feedback?: string;
  cancelReason?: string;
}
