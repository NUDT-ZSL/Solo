export interface Room {
  id: string;
  type: 'standard' | 'deluxe' | 'suite';
  name: string;
  area: number;
  weekdayPrice: number;
  weekendPrice: number;
  description: string;
}

export interface Booking {
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
  id: string;
  bookingId: string;
  timestamp: string;
  type: 'feeding' | 'walking' | 'bathing' | 'medication';
  notes: string;
  photoUrl?: string;
  rating?: number;
}

export interface BookingFormData {
  step: 1 | 2;
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

export interface PriceBreakdown {
  roomTotal: number;
  feeding: number;
  walking: number;
  bathing: number;
}

export interface PriceCalculation {
  totalPrice: number;
  days: number;
  breakdown: PriceBreakdown;
}
