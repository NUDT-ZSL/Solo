export interface FitnessClass {
  id: string;
  name: string;
  type: string;
  coach: string;
  coachId: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  participants: string[];
  calories: number;
}

export interface User {
  id: string;
  name: string;
  role: 'member' | 'coach';
  bookings: string[];
  completedClasses: CompletedClass[];
}

export interface CompletedClass {
  classId: string;
  className: string;
  coach: string;
  date: string;
  calories: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
