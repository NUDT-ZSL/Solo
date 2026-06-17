export interface Device {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: 'available' | 'borrowed' | 'maintenance';
  minCreditScore: number;
  specs: Record<string, string>;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  creditScore: number;
  isAdmin: boolean;
}

export interface BorrowRecord {
  id: string;
  deviceId: string;
  userId: string;
  borrowTime: string;
  returnTime: string | null;
  status: 'returned_on_time' | 'returned_overdue' | 'not_returned';
}
