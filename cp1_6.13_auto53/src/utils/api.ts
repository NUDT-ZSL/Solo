import axios from 'axios';
import type { Room, Booking, DailyLogEntry, PriceCalculation, ScheduleItem } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const roomApi = {
  getAll: (): Promise<Room[]> => api.get('/rooms').then(res => res.data),
};

export const bookingApi = {
  create: (data: {
    roomId: string;
    checkIn: string;
    checkOut: string;
    petCount: number;
    petNames: string[];
    services: { feeding: boolean; walking: number; bathing: number };
  }): Promise<Booking> => api.post('/bookings', data).then(res => res.data),
  
  getSchedule: (id: string): Promise<{
    booking: Booking;
    schedule: ScheduleItem[];
    dailyBreakdown: Array<{
      date: string;
      isWeekend: boolean;
      basePrice: number;
      services: { feeding: number };
    }>;
  }> => api.get(`/bookings/${id}/schedule`).then(res => res.data),
  
  getAll: (): Promise<Booking[]> => api.get('/bookings').then(res => res.data),
};

export const logApi = {
  create: (data: {
    bookingId: string;
    type: 'feeding' | 'walking' | 'bathing' | 'medication';
    notes: string;
    photoUrl?: string;
    rating?: number;
  }): Promise<DailyLogEntry> => api.post('/logs', data).then(res => res.data),
  
  getByBooking: (bookingId: string): Promise<DailyLogEntry[]> => 
    api.get(`/logs/${bookingId}`).then(res => res.data),
};

export const scheduleApi = {
  getBoard: (days: number = 14): Promise<{
    dates: string[];
    rooms: Room[];
    schedule: Record<string, ScheduleItem[]>;
  }> => api.get(`/schedule?days=${days}`).then(res => res.data),
};

export const priceApi = {
  calculate: (params: {
    roomId: string;
    checkIn: string;
    checkOut: string;
    feeding: boolean;
    walking: number;
    bathing: number;
  }): Promise<PriceCalculation> => 
    api.get('/price/calculate', { params }).then(res => res.data),
};
