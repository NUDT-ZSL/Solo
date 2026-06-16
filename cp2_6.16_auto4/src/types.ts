export type BookStatus = 'available' | 'drifting' | 'offline';
export type ApplicationStatus = 'pending' | 'drifting' | 'completed';
export type DriftRecordStatus = 'start' | 'middle' | 'current';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  publishInfo: string;
  status: BookStatus;
  publishTime: string;
  driftCount: number;
  currentHolder: string;
  publisherId: string;
  publisherName: string;
  applications: Application[];
}

export interface DriftRecord {
  id: string;
  bookId: string;
  fromLocation: string;
  toLocation: string;
  time: string;
  holderName: string;
  status: DriftRecordStatus;
}

export interface Application {
  id: string;
  bookId: string;
  bookTitle: string;
  applicantId: string;
  applicantName: string;
  status: ApplicationStatus;
  applyTime: string;
  location: string;
}

export interface CreateBookRequest {
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  publishInfo: string;
  publisherId: string;
  publisherName: string;
}

export interface ApplyDriftRequest {
  applicantId: string;
  applicantName: string;
  location: string;
}
