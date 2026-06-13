import axios from 'axios';

export interface User {
  _id: string;
  name: string;
  role: 'member' | 'coach';
  avatar?: string;
}

export interface Course {
  _id: string;
  name: string;
  coachId: string;
  coachName: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  type: 'group' | 'private';
  bookedCount?: number;
  remaining?: number;
}

export interface Booking {
  _id: string;
  userId: string;
  courseId: string;
  courseName: string;
  coachName: string;
  date: string;
  time: string;
  duration: number;
  status: 'booked' | 'checked-in' | 'cancelled';
  createdAt: string;
  userName?: string;
}

export interface TrainingRecord {
  _id: string;
  userId: string;
  date: string;
  type: 'training' | 'body';
  courseName?: string;
  coachName?: string;
  duration?: number;
  notes?: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  calories?: number;
  createdAt: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export async function loginUser(name: string): Promise<User> {
  const res = await api.post('/users/login', { name });
  return res.data;
}

export async function getUser(id: string): Promise<User> {
  const res = await api.get(`/users/${id}`);
  return res.data;
}

export async function getCourses(): Promise<Course[]> {
  const res = await api.get('/courses');
  return res.data;
}

export async function createCourse(data: Omit<Course, '_id' | 'bookedCount' | 'remaining'>): Promise<Course> {
  const res = await api.post('/courses', data);
  return res.data;
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  const res = await api.put(`/courses/${id}`, data);
  return res.data;
}

export async function deleteCourse(id: string): Promise<{ success: boolean; cancelledBookings: Booking[] }> {
  const res = await api.delete(`/courses/${id}`);
  return res.data;
}

export async function createBooking(userId: string, courseId: string): Promise<Booking> {
  const res = await api.post('/bookings', { userId, courseId });
  return res.data;
}

export async function cancelBooking(id: string): Promise<{ success: boolean }> {
  const res = await api.delete(`/bookings/${id}`);
  return res.data;
}

export async function checkinBooking(id: string): Promise<Booking> {
  const res = await api.put(`/bookings/${id}/checkin`);
  return res.data;
}

export async function getBookings(params?: { userId?: string; courseId?: string; status?: string; days?: number }): Promise<Booking[]> {
  const res = await api.get('/bookings', { params });
  return res.data;
}

export async function getUserRecords(userId: string): Promise<TrainingRecord[]> {
  const res = await api.get(`/records/${userId}`);
  return res.data;
}

export async function createRecord(data: Omit<TrainingRecord, '_id' | 'createdAt'>): Promise<TrainingRecord> {
  const res = await api.post('/records', data);
  return res.data;
}

export async function getBodyTrend(userId: string, period: 'week' | 'month' = 'week'): Promise<TrainingRecord[]> {
  const res = await api.get(`/records/${userId}/trend`, { params: { period } });
  return res.data;
}
