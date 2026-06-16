export interface Device {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: 'available' | 'borrowed' | 'maintenance';
  minCreditScore: number;
  specs: Record<string, string>;
  description: string;
  borrowRecords?: BorrowRecordWithUser[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  creditScore: number;
  role: 'user' | 'admin';
  borrowRecords?: BorrowRecordWithDevice[];
}

export interface BorrowRecord {
  id: string;
  deviceId: string;
  userId: string;
  borrowTime: string;
  returnTime: string | null;
  status: 'borrowing' | 'returned_on_time' | 'overdue_returned';
}

export interface BorrowRecordWithUser extends BorrowRecord {
  userName: string;
}

export interface BorrowRecordWithDevice extends BorrowRecord {
  deviceName: string;
}

export interface BorrowRecordWithInfo extends BorrowRecord {
  deviceName: string;
  userName: string;
}

export type BorrowStatus = 'idle' | 'loading' | 'success' | 'error';
