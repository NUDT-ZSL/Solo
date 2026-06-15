export type PetType = 'dog' | 'cat' | 'rabbit' | 'hamster';
export type ServiceType = 'daycare' | 'overnight' | 'walking' | 'homefeeding';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface ReviewTag {
  text: string;
  count: number;
}

export interface Caregiver {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  bio: string;
  acceptedPets: PetType[];
  services: { type: ServiceType; price: number }[];
  servedCount: number;
  reviewTags: ReviewTag[];
  bookedDates: string[];
}

export interface Order {
  id: string;
  caregiverId: string;
  caregiverName: string;
  ownerId: string;
  ownerName: string;
  petType: PetType;
  petName: string;
  serviceType: ServiceType;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: OrderStatus;
  rating?: number;
  review?: string;
  createdAt: string;
}

export interface FilterCriteria {
  petType?: PetType;
  serviceType?: ServiceType;
  startDate?: string;
  endDate?: string;
  minRating?: number;
}

export interface ScheduleConflict {
  hasConflict: boolean;
  conflictingDates?: string[];
}

export interface MatchResult {
  caregiver: Caregiver;
  score: number;
  nearestAvailableDate: string;
  matchedServices: ServiceType[];
}

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: '狗狗',
  cat: '猫咪',
  rabbit: '兔子',
  hamster: '仓鼠'
};

export const PET_TYPE_COLORS: Record<PetType, string> = {
  dog: '#FF6B6B',
  cat: '#4ECDC4',
  rabbit: '#A8E6CF',
  hamster: '#FFD93D'
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  daycare: '日间寄养',
  overnight: '过夜寄养',
  walking: '遛狗',
  homefeeding: '上门喂食'
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#FFA500',
  confirmed: '#3CB371',
  completed: '#4682B4',
  cancelled: '#A9A9A9'
};
