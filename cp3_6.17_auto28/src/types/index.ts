export type DeviceStatus = 'available' | 'borrowed' | 'maintenance';
export type RecordStatus = 'borrowing' | 'returned_on_time' | 'returned_overdue';

export interface Device {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: DeviceStatus;
  creditRequirement: number;
  specs: Record<string, string>;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  creditScore: number;
}

export interface BorrowRecord {
  id: string;
  deviceId: string;
  userId: string;
  borrowTime: string;
  returnTime?: string;
  status: RecordStatus;
}

export interface BorrowRecordWithDetails extends BorrowRecord {
  deviceName: string;
  userName: string;
  userInitial: string;
}

export interface DeviceDetail extends Device {
  borrowHistory: BorrowRecordWithDetails[];
}

export interface UserDetail extends User {
  borrowHistory: BorrowRecordWithDetails[];
}

export const STATUS_CONFIG: Record<DeviceStatus, { label: string; color: string; bgColor: string }> = {
  available: { label: '空闲', color: '#16a34a', bgColor: '#dcfce7' },
  borrowed: { label: '被借', color: '#ca8a04', bgColor: '#fef9c3' },
  maintenance: { label: '维修', color: '#dc2626', bgColor: '#fee2e2' }
};

export const RECORD_STATUS_CONFIG: Record<RecordStatus, { label: string; color: string; bgColor: string }> = {
  borrowing: { label: '未归还', color: '#dc2626', bgColor: '#fee2e2' },
  returned_on_time: { label: '按时归还', color: '#16a34a', bgColor: '#dcfce7' },
  returned_overdue: { label: '超时归还', color: '#ca8a04', bgColor: '#fef9c3' }
};
