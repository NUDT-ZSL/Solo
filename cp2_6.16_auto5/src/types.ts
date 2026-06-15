export type PlantSpecies = '绿萝' | '仙人掌' | '虎皮兰' | '多肉' | '龟背竹';

export interface Plant {
  id: number;
  name: string;
  species: PlantSpecies;
  plantDate: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlantLog {
  id: number;
  plantId: number;
  date: string;
  watered: boolean;
  fertilized: boolean;
  lightHours: number;
  notes: string;
  createdAt: string;
}

export interface ScheduleTask {
  type: 'water' | 'fertilize';
  completed: boolean;
}

export interface ScheduleItem {
  date: string;
  plantId: number;
  plantName: string;
  tasks: ScheduleTask[];
}

export interface CareAdvice {
  plantId: number;
  advice: string;
  lastUpdated: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlantFormData {
  name: string;
  species: PlantSpecies;
  plantDate: string;
  location: string;
}

export interface LogFormData {
  date: string;
  watered: boolean;
  fertilized: boolean;
  lightHours: number;
  notes: string;
}
