export interface PlanRequest {
  destination: string;
  days: number;
  preferences: string[];
  budget: string;
}

export interface Spot {
  id: string;
  name: string;
  description: string;
  time: string;
  duration: string;
  lat: number;
  lng: number;
  coordinates: [number, number];
  imagePrompt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  price: string;
}

export interface DayPlan {
  id: string;
  date: number;
  summary: string[];
  spots: Spot[];
  restaurants: Restaurant[];
}

export interface TravelPlan {
  id: string;
  destination: string;
  days: number;
  preferences: string[];
  budget: string;
  dailyPlans: DayPlan[];
  createdAt: string;
}

export interface TravelContextType {
  plan: TravelPlan | null;
  isLoading: boolean;
  error: string | null;
  generatePlan: (request: PlanRequest) => Promise<void>;
  reorderDays: (fromIndex: number, toIndex: number) => void;
  removeDay: (dayId: string) => void;
  updateDayPlan: (dayId: string, updatedDay: DayPlan) => void;
  clearPlan: () => void;
}

export const PREFERENCE_TAGS = ['文化', '美食', '自然', '购物', '冒险'];

export const BUDGET_OPTIONS = ['经济', '中等', '豪华'];
