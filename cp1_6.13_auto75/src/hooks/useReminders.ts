import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Reminder } from '../types';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await axios.get('/api/reminders');
      setReminders(res.data);
    } catch (err) {
      console.error('获取逾期提醒失败', err);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    const timer = setInterval(fetchReminders, 30000);
    return () => clearInterval(timer);
  }, [fetchReminders]);

  const removeReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  return { reminders, fetchReminders, removeReminder };
}
