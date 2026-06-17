export type DeviceStatus = 'idle' | 'borrowed' | 'maintenance';

export interface DeviceSpec {
  label: string;
  value: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: DeviceStatus;
  minCreditScore: number;
  specs: DeviceSpec[];
  history?: BorrowRecord[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  creditScore: number;
  role: 'user' | 'admin';
  records?: BorrowRecord[];
}

export type RecordStatus = 'ongoing' | 'on-time' | 'overdue';

export interface BorrowRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  userId: string;
  userName: string;
  borrowTime: string;
  returnTime: string | null;
  status: RecordStatus;
}

export interface BorrowResult {
  record: BorrowRecord;
  device: Device;
}
