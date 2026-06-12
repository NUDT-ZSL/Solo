import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  cover_emoji: string;
  description: string;
  publisher: string;
  publish_date: string;
  location: string;
  status: 'available' | 'borrowed' | 'reserved';
  created_at: string;
}

export interface Reservation {
  id: string;
  book_id: string;
  user_id: string;
  pickup_date: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  created_at: string;
  title?: string;
  author?: string;
  cover_emoji?: string;
  location?: string;
  user_name?: string;
}

export interface BorrowRecord {
  id: string;
  book_id: string;
  user_id: string;
  reservation_id?: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  fine_amount: number;
  status: 'borrowed' | 'returned' | 'overdue';
  created_at: string;
  title?: string;
  author?: string;
  cover_emoji?: string;
  category?: string;
  user_name?: string;
  current_fine?: number;
  current_status?: string;
}

export interface ReadingSession {
  id: string;
  book_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration: number;
  title?: string;
  author?: string;
  cover_emoji?: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  reservations: Reservation[];
  fetchReservations: () => void;
  borrowRecords: BorrowRecord[];
  fetchBorrowRecords: () => void;
  pickupNotifications: Reservation[];
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);

  useEffect(() => {
    const defaultUser: User = {
      id: 'u001',
      name: '张三',
      email: 'zhangsan@example.com',
      role: 'user'
    };
    setUser(defaultUser);
  }, []);

  const fetchReservations = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/books/reservations/user/${user.id}`);
      if (res.data.success) {
        setReservations(res.data.data);
      }
    } catch (error) {
      console.error('获取预约列表失败', error);
    }
  };

  const fetchBorrowRecords = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/borrow/user/${user.id}`);
      if (res.data.success) {
        setBorrowRecords(res.data.data);
      }
    } catch (error) {
      console.error('获取借阅记录失败', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReservations();
      fetchBorrowRecords();
    }
  }, [user]);

  const pickupNotifications = reservations.filter(r => {
    if (r.status !== 'pending' && r.status !== 'approved') return false;
    const pickupDate = new Date(r.pickup_date);
    const now = new Date();
    const diffHours = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours > -24;
  });

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      reservations,
      fetchReservations,
      borrowRecords,
      fetchBorrowRecords,
      pickupNotifications,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
