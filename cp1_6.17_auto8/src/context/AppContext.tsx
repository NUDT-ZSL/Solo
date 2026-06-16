import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, LeaderboardEntry, CoffeeLog } from '../types';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  leaderboard: LeaderboardEntry[];
  setLeaderboard: (lb: LeaderboardEntry[]) => void;
  fetchLeaderboard: () => Promise<void>;
  logs: CoffeeLog[];
  setLogs: (logs: CoffeeLog[]) => void;
  loadMoreLogs: () => Promise<void>;
  hasMoreLogs: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    id: '1',
    username: '咖啡猎人',
    avatar: 'https://i.pravatar.cc/100?img=1',
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [logs, setLogs] = useState<CoffeeLog[]>([]);
  const [page, setPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    }
  };

  const loadMoreLogs = async () => {
    try {
      const res = await fetch(`/api/logs?page=${page}&pageSize=9`);
      const data = await res.json();
      if (page === 1) {
        setLogs(data.logs);
      } else {
        setLogs((prev) => [...prev, ...data.logs]);
      }
      setPage((p) => p + 1);
      setHasMoreLogs(data.hasMore);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    loadMoreLogs();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        leaderboard,
        setLeaderboard,
        fetchLeaderboard,
        logs,
        setLogs,
        loadMoreLogs,
        hasMoreLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
