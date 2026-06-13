export interface Room {
  _id?: string;
  id: string;
  type: 'standard' | 'deluxe' | 'suite';
  name: string;
  area: number;
  weekdayPrice: number;
  weekendPrice: number;
  description: string;
}

export interface Booking {
  _id?: string;
  id: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  petCount: number;
  petNames: string[];
  services: {
    feeding: boolean;
    walking: number;
    bathing: number;
  };
  totalPrice: number;
  createdAt: string;
}

export interface ScheduleItem {
  date: string;
  roomId: string;
  bookingId: string;
  petNames: string[];
  isConflict: boolean;
}

export interface DailyLogEntry {
  _id?: string;
  id: string;
  bookingId: string;
  timestamp: string;
  type: 'feeding' | 'walking' | 'bathing' | 'medication';
  notes: string;
  photoUrl?: string;
  rating?: number;
}

export interface BookingCreateDTO {
  roomId: string;
  checkIn: string;
  checkOut: string;
  petCount: number;
  petNames: string[];
  services: {
    feeding: boolean;
    walking: number;
    bathing: number;
  };
}

export interface DailyLogCreateDTO {
  bookingId: string;
  type: 'feeding' | 'walking' | 'bathing' | 'medication';
  notes: string;
  photoUrl?: string;
  rating?: number;
}
