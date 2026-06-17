export interface Child {
  name: string;
  age: number;
}

export interface Registration {
  id: string;
  parentName: string;
  phone: string;
  children: Child[];
  checkedIn: boolean;
  registeredAt: string;
}

export interface Activity {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  ageGroups: string[];
  maxParticipants: number;
  description: string;
  coverImage: string;
  createdAt: string;
  registrations: Registration[];
}

export interface Photo {
  id: string;
  activityId: string;
  url: string;
  filename: string;
  isFavorite: boolean;
  uploadedAt: string;
}

export interface CreateActivityData {
  name: string;
  dateTime: string;
  location: string;
  ageGroups: string[];
  maxParticipants: number;
  description: string;
  coverImage: File;
}

export interface RegisterData {
  parentName: string;
  phone: string;
  children: Child[];
}

export type RegistrationStatus = 'available' | 'filling' | 'full';
