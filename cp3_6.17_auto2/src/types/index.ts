export type DeviceStatus = 'available' | 'borrowed' | 'maintenance';

export interface Device {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: DeviceStatus;
  minCreditScore: number;
  specs: Record<string, string>;
  borrowHistory?: BorrowRecord[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type RecordStatus = 'borrowing' | 'returned-on-time' | 'overdue-returned';

export interface BorrowRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  userId: string;
  userName: string;
  borrowTime: string;
  returnTime: string | null;
  expectedReturnTime: string;
  status: RecordStatus;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  creditScore: number;
  role: UserRole;
  department: string;
  joinDate: string;
  borrowHistory?: BorrowRecord[];
}

export interface BorrowResponse {
  success: boolean;
  record: BorrowRecord;
  qrCodeData: string;
}

export interface ReturnResponse {
  success: boolean;
  record: BorrowRecord;
  isOverdue: boolean;
  updatedCreditScore?: number;
}

export interface Stats {
  totalDevices: number;
  availableDevices: number;
  borrowedDevices: number;
  maintenanceDevices: number;
  totalUsers: number;
  totalRecords: number;
  activeBorrowings: number;
  overdueBorrowings: number;
}
