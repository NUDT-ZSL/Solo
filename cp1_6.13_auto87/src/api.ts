import axios from 'axios';
import type {
  Course,
  Booking,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateBookingRequest,
  ApiResponse,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export async function fetchCourses(): Promise<Course[]> {
  const res = await api.get<ApiResponse<Course[]>>('/courses');
  return res.data.data ?? [];
}

export async function fetchCourse(id: string): Promise<Course> {
  const res = await api.get<ApiResponse<Course>>(`/courses/${id}`);
  if (!res.data.data) throw new Error('Course not found');
  return res.data.data;
}

export async function submitBooking(data: CreateBookingRequest): Promise<Booking> {
  const res = await api.post<ApiResponse<Booking>>('/bookings', data);
  if (!res.data.success) {
    throw new Error(res.data.message ?? 'Booking failed');
  }
  if (!res.data.data) throw new Error('Booking failed');
  return res.data.data;
}

export async function fetchBookings(): Promise<Booking[]> {
  const res = await api.get<ApiResponse<Booking[]>>('/bookings');
  return res.data.data ?? [];
}

export async function fetchBookingsByCourse(courseId: string): Promise<Booking[]> {
  const res = await api.get<ApiResponse<Booking[]>>(`/bookings/course/${courseId}`);
  return res.data.data ?? [];
}

export async function adminCreateCourse(data: CreateCourseRequest): Promise<Course> {
  const res = await api.post<ApiResponse<Course>>('/courses', data);
  if (!res.data.data) throw new Error('Failed to create course');
  return res.data.data;
}

export async function adminUpdateCourse(id: string, data: UpdateCourseRequest): Promise<Course> {
  const res = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
  if (!res.data.data) throw new Error('Failed to update course');
  return res.data.data;
}

export async function adminDeleteCourse(id: string): Promise<Course> {
  const res = await api.delete<ApiResponse<Course>>(`/courses/${id}`);
  if (!res.data.data) throw new Error('Failed to cancel course');
  return res.data.data;
}

export async function adminApproveBooking(id: string): Promise<Booking> {
  const res = await api.put<ApiResponse<Booking>>(`/bookings/${id}/approve`);
  if (!res.data.data) throw new Error('Failed to approve booking');
  return res.data.data;
}

export async function adminRejectBooking(id: string): Promise<Booking> {
  const res = await api.put<ApiResponse<Booking>>(`/bookings/${id}/reject`);
  if (!res.data.data) throw new Error('Failed to reject booking');
  return res.data.data;
}
