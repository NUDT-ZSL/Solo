import type { ClassType, UserRole } from "../constants/classTypes";

export interface Store {
  _id: string;
  name: string;
  address?: string;
}

export interface Member {
  _id: string;
  name: string;
  role: UserRole;
}

export interface GymClass {
  _id: string;
  name: string;
  type: ClassType | string;
  coach: string;
  coachBio: string;
  description: string;
  storeId: string;
  storeName: string;
  date: string;
  timeSlot: string;
  capacity: number;
  bookedCount: number;
  bookedMembers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  classId: string;
  memberId: string;
  memberName: string;
  createdAt: string;
}

export interface ClassChange {
  _id: string;
  classId: string;
  className: string;
  changeType: "updated" | "cancelled";
  affectedMembers: string[];
  timestamp: string;
}

export interface HeatmapCell {
  storeId: string;
  storeName: string;
  timeSlot: string;
  fillRate: number;
  totalCapacity: number;
  totalBooked: number;
  classes: GymClass[];
}

export interface HeatmapMatrix {
  stores: Store[];
  timeSlots: string[];
  cells: HeatmapCell[][];
}

export interface CreateClassInput {
  name: string;
  type: ClassType | string;
  coach: string;
  coachBio: string;
  description: string;
  storeId: string;
  storeName: string;
  date: string;
  timeSlot: string;
  capacity: number;
}

export type UpdateClassInput = Partial<CreateClassInput>;

export interface BookClassInput {
  classId: string;
  memberId: string;
  memberName: string;
}

export interface CancelBookingInput {
  classId: string;
  memberId: string;
}

export interface WsMessageClassUpdate {
  type: "class_updated" | "class_cancelled";
  classId: string;
  className: string;
  affectedMembers: string[];
  timestamp: string;
}

export type WsMessage = WsMessageClassUpdate;
