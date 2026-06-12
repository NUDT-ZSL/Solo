export interface CourseType {
  _id: string;
  name: string;
  color: string;
  duration: number;
}

export interface Coach {
  _id: string;
  name: string;
  phone: string;
}

export interface Member {
  _id: string;
  name: string;
  phone: string;
}

export interface Course {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  courseTypeId: string;
  coachId: string;
  capacity: number;
  bookedCount: number;
  status: 'active' | 'cancelled';
  cancelReason?: string;
}

export interface Booking {
  _id: string;
  courseId: string;
  memberId: string;
  memberName: string;
  createdAt: string;
  status: 'booked' | 'cancelled';
  course?: Course;
  courseType?: CourseType;
  coach?: Coach;
}

export interface Notification {
  _id: string;
  courseId: string;
  courseName: string;
  originalTime: string;
  reason: string;
  memberIds: string[];
  readMemberIds: string[];
  createdAt: string;
}

const BASE = '/api';

async function request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  getCourseTypes: () => request<CourseType[]>('/course-types'),
  createCourseType: (data: Partial<CourseType>) =>
    request<CourseType>('/course-types', { method: 'POST', body: JSON.stringify(data) }),
  updateCourseType: (id: string, data: Partial<CourseType>) =>
    request<CourseType>(`/course-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourseType: (id: string) =>
    request(`/course-types/${id}`, { method: 'DELETE' }),

  getCoaches: () => request<Coach[]>('/coaches'),
  createCoach: (data: Partial<Coach>) =>
    request<Coach>('/coaches', { method: 'POST', body: JSON.stringify(data) }),
  updateCoach: (id: string, data: Partial<Coach>) =>
    request<Coach>(`/coaches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCoach: (id: string) => request(`/coaches/${id}`, { method: 'DELETE' }),

  getMembers: () => request<Member[]>('/members'),

  getCourses: (params?: { startDate?: string; endDate?: string; coachId?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<Course[]>(`/courses${q ? '?' + q : ''}`);
  },
  getCourse: (id: string) => request<Course>(`/courses/${id}`),
  createCourse: (data: Partial<Course>) =>
    request<Course>('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: Partial<Course>) =>
    request<Course>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id: string, reason?: string) =>
    request(`/courses/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),

  getBookings: (params?: { courseId?: string; memberId?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<Booking[]>(`/bookings${q ? '?' + q : ''}`);
  },
  createBooking: (data: { courseId: string; memberId: string; memberName: string }) =>
    request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id: string) =>
    request(`/bookings/${id}`, { method: 'DELETE' }),

  getNotifications: (memberId: string) =>
    request<Notification[]>(`/notifications?memberId=${memberId}`),
  markNotificationRead: (id: string, memberId: string) =>
    request(`/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({ memberId }) })
};
