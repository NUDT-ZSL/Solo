import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Activity,
  Volunteer,
  Registration,
  ScheduleAssignment,
  Notification,
  CompletionRate,
  CreateActivityData,
} from '../types';

interface AppContextType {
  activities: Activity[];
  volunteers: Volunteer[];
  notifications: Notification[];
  completionRates: CompletionRate[];
  fetchActivities: (month?: string) => Promise<void>;
  fetchVolunteers: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchCompletionRates: () => Promise<void>;
  createActivity: (data: CreateActivityData) => Promise<Activity | null>;
  registerActivity: (activityId: string, volunteerName: string) => Promise<Registration | null>;
  getRegistrations: (activityId: string) => Promise<Registration[]>;
  getSchedules: (activityId: string) => Promise<ScheduleAssignment[]>;
  addSchedule: (activityId: string, volunteerId: string, volunteerName: string) => Promise<ScheduleAssignment | null>;
  removeSchedule: (scheduleId: string) => Promise<boolean>;
  dismissNotification: (notificationId: string) => Promise<void>;
  checkNotifications: () => Promise<void>;
  exportSchedule: (year: number, month: number) => void;
  showDownloadProgress: boolean;
  downloadProgress: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [completionRates, setCompletionRates] = useState<CompletionRate[]>([]);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const fetchActivities = useCallback(async (month?: string) => {
    try {
      const url = month ? `/api/activities?month=${month}` : '/api/activities';
      const res = await fetch(url);
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  }, []);

  const fetchVolunteers = useCallback(async () => {
    try {
      const res = await fetch('/api/volunteers');
      const data = await res.json();
      setVolunteers(data);
    } catch (err) {
      console.error('Failed to fetch volunteers:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  const fetchCompletionRates = useCallback(async () => {
    try {
      const res = await fetch('/api/stats/completion-rate');
      const data = await res.json();
      setCompletionRates(data);
    } catch (err) {
      console.error('Failed to fetch completion rates:', err);
    }
  }, []);

  const createActivity = useCallback(async (data: CreateActivityData) => {
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        fetchActivities();
        fetchNotifications();
        return result;
      }
      return null;
    } catch (err) {
      console.error('Failed to create activity:', err);
      return null;
    }
  }, [fetchActivities, fetchNotifications]);

  const registerActivity = useCallback(async (activityId: string, volunteerName: string) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteerName }),
      });
      if (res.ok) {
        const result = await res.json();
        return result;
      }
      return null;
    } catch (err) {
      console.error('Failed to register:', err);
      return null;
    }
  }, []);

  const getRegistrations = useCallback(async (activityId: string) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/registrations`);
      return await res.json();
    } catch (err) {
      console.error('Failed to get registrations:', err);
      return [];
    }
  }, []);

  const getSchedules = useCallback(async (activityId: string) => {
    try {
      const res = await fetch(`/api/schedules?activityId=${activityId}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to get schedules:', err);
      return [];
    }
  }, []);

  const addSchedule = useCallback(async (activityId: string, volunteerId: string, volunteerName: string) => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, volunteerId, volunteerName }),
      });
      if (res.ok) {
        const result = await res.json();
        fetchCompletionRates();
        return result;
      }
      return null;
    } catch (err) {
      console.error('Failed to add schedule:', err);
      return null;
    }
  }, [fetchCompletionRates]);

  const removeSchedule = useCallback(async (scheduleId: string) => {
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchCompletionRates();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to remove schedule:', err);
      return false;
    }
  }, [fetchCompletionRates]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  }, []);

  const checkNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/check', { method: 'POST' });
      if (res.ok) {
        const newNotifications = await res.json();
        if (newNotifications.length > 0) {
          setNotifications((prev) => [...newNotifications, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to check notifications:', err);
    }
  }, []);

  const exportSchedule = useCallback((year: number, month: number) => {
    setShowDownloadProgress(true);
    setDownloadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setShowDownloadProgress(false), 500);
      }
      setDownloadProgress(progress);
    }, 100);

    const url = `/api/report/schedule?year=${year}&month=${month}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule_${year}_${String(month).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkNotifications();
    }, 60000);
    checkNotifications();
    return () => clearInterval(interval);
  }, [checkNotifications]);

  const value: AppContextType = {
    activities,
    volunteers,
    notifications,
    completionRates,
    fetchActivities,
    fetchVolunteers,
    fetchNotifications,
    fetchCompletionRates,
    createActivity,
    registerActivity,
    getRegistrations,
    getSchedules,
    addSchedule,
    removeSchedule,
    dismissNotification,
    checkNotifications,
    exportSchedule,
    showDownloadProgress,
    downloadProgress,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
