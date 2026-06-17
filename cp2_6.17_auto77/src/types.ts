export interface Child {
  name: string;
  age: number;
}

export interface Activity {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  ageGroups: string[];
  capacity: number;
  description: string;
  coverImage: string | null;
  createdAt: string;
}

export interface Registration {
  id: string;
  activityId: string;
  parentName: string;
  phone: string;
  children: Child[];
  checkIn: boolean;
  createdAt: string;
}

export interface Photo {
  id: string;
  activityId: string;
  url: string;
  filename: string;
  favorite: boolean;
  uploadedAt: string;
}

export interface ToastMessage {
  id: number;
  message: string;
}

export interface ActivityCreateData {
  name: string;
  dateTime: string;
  location: string;
  ageGroups: string[];
  capacity: number;
  description: string;
}

export interface RegistrationFormData {
  parentName: string;
  phone: string;
  children: Child[];
}

export interface SearchActivityParams {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  ageGroup?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;
