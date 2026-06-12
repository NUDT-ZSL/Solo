import axios from 'axios';
import type { Work, Course, CourseSlot, ApiResponse, WorksResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const worksApi = {
  getWorks: (page: number = 1, pageSize: number = 8, category?: string) => {
    const params: Record<string, string | number> = { page, pageSize };
    if (category && category !== '全部') params.category = category;
    return api.get<ApiResponse<WorksResponse>>('/works', { params });
  },

  getWorkById: (id: string) => {
    return api.get<ApiResponse<Work>>(`/works/${id}`);
  },

  createOrder: (data: { customer_name: string; phone: string; items: unknown[]; total_price: number }) => {
    return api.post<ApiResponse<{ id: string; message: string }>>('/orders', data);
  }
};

export const coursesApi = {
  getCourses: () => {
    return api.get<ApiResponse<Course[]>>('/courses');
  },

  getCourseSlots: (courseId: string, date?: string) => {
    const params = date ? { date } : {};
    return api.get<ApiResponse<CourseSlot[]>>(`/courses/${courseId}/slots`, { params });
  },

  getSlotsByDate: (date: string) => {
    return api.get<ApiResponse<{ date: string; course_id: string }[]>>(`/slots/by-date/${date}`);
  },

  createBooking: (data: { slot_id: string; course_id: string; customer_name: string; phone: string }) => {
    return api.post<ApiResponse<{ id: string; message: string }>>('/bookings', data);
  }
};
