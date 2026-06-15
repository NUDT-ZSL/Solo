export type TravelTheme = 'city' | 'nature' | 'adventure';

export interface TravelPhoto {
  id: string;
  url: string;
  caption: string;
}

export interface LocationNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface TravelLocation {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  theme: TravelTheme;
  visitDate: string;
  rating: number;
  coverImage: string;
  photos: TravelPhoto[];
  notes: LocationNote[];
  description: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  travelCount: number;
  countryCount: number;
}
