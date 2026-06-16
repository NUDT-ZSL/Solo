export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  description: string;
  duration: string;
  type: 'attraction' | 'restaurant' | 'hotel';
}

export interface ScheduleItem extends POI {
  time: string;
}

export interface DayItinerary {
  day: number;
  schedule: ScheduleItem[];
}
