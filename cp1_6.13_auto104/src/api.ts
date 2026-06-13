import axios from 'axios';

export interface Pattern {
  _id: string;
  name: string;
  category: string;
  size: { width: number; height: number };
  image: string;
  createdAt: string;
}

export interface Appointment {
  _id: string;
  name: string;
  phone: string;
  datetime: string;
  createdAt: string;
}

export interface AppointmentCreateData {
  name: string;
  phone: string;
  datetime: string;
}

export interface PatternCreateData {
  name: string;
  category: string;
  image: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const getPatterns = async (): Promise<Pattern[]> => {
  const response = await api.get('/patterns');
  return response.data.patterns;
};

export const uploadPattern = async (data: PatternCreateData): Promise<Pattern> => {
  const response = await api.post('/patterns', data);
  return response.data.pattern;
};

export const updatePattern = async (id: string, data: Partial<PatternCreateData>): Promise<Pattern> => {
  const response = await api.put(`/patterns/${id}`, data);
  return response.data.pattern;
};

export const deletePattern = async (id: string): Promise<void> => {
  await api.delete(`/patterns/${id}`);
};

export const getAppointments = async (): Promise<Appointment[]> => {
  const response = await api.get('/appointments');
  return response.data.appointments;
};

export const createAppointment = async (data: AppointmentCreateData): Promise<Appointment> => {
  const response = await api.post('/appointments', data);
  return response.data.appointment;
};

export const deleteAppointment = async (id: string): Promise<void> => {
  await api.delete(`/appointments/${id}`);
};

export default api;
