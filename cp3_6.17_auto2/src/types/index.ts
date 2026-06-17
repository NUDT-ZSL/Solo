export type DeviceStatus = 'available' | 'borrowed' | 'maintenance';

export type RecordStatus = 'borrowing' | 'returned_on_time' | 'returned_overdue';

export type UserRole = 'user' | 'admin';

export interface Device {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: DeviceStatus;
  minCreditScore: number;
  specifications: Record<string, string>;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  creditScore: number;
  role: UserRole;
}

export interface BorrowRecord {
  id: string;
  deviceId: string;
  userId: string;
  borrowTime: string;
  expectedReturnTime: string;
  actualReturnTime: string | null;
  status: RecordStatus;
}

export interface BorrowRecordWithDetails extends BorrowRecord {
  deviceName?: string;
  userName?: string;
  userInitial?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const STATUS_LABELS: Record<DeviceStatus, string> = {
  available: '空闲',
  borrowed: '被借',
  maintenance: '维修',
};

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  borrowing: '借用中',
  returned_on_time: '按时归还',
  returned_overdue: '超时归还',
};

export const STATUS_COLORS: Record<DeviceStatus, string> = {
  available: '#22c55e',
  borrowed: '#eab308',
  maintenance: '#ef4444',
};

export const RECORD_STATUS_COLORS: Record<RecordStatus, string> = {
  borrowing: '#eab308',
  returned_on_time: '#22c55e',
  returned_overdue: '#ef4444',
};
