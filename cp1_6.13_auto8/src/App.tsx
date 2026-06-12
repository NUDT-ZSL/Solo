import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Habit, DailyStats, CheckIn } from './types';
import HabitCard from './components/HabitCard';
import HabitModal from './components/HabitModal';
import WeeklyTimeline from './components/WeeklyTimeline';

const motivationalQuotes = [
  '每一个今天，都是你未来的基石 🌱',
  '小步前进，终将抵达远方 ✨',
  '坚持的意义，在于遇见更好的自己 💪',
  '今天的努力，是明天的礼物 🎁',
  '做自己生活的掌控者 🌟',
  '习惯塑造人生，从今天开始 🏃',
  '不积跬步，无以至千里 📚',
  '你的坚持，终将闪闪发光 ⭐',
  '慢慢来，比较快 🐢',
  '一切伟大的行动，都有一个微不足道的开始 🌅',
];

const getRandomQuote = () => {
  return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
};

const App: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [habitWeeklyStatus, setHabitWeeklyStatus] = useState<{ [habitId: string]: boolean[] }>({});
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quote] = useState<string>(getRandomQuote);
  const [today] = useState<Date>(new Date());

  const showError = useCallback((message: string) => {
    console.error('[App Error]', message);
    setError(message);
    window.setTimeout(() => setError(null), 4000);
  }, []);

  const showSuccess = useCallback((message: string) => {
    console.log('[App Success]', message);
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 2500);
  }, []);

  const fetchHabits = useCallback(async (): Promise<Habit[]> => {
    try {
      const response = await fetch('/api/habits');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 获取习惯列表失败`);
      }
      const data: Habit[] = await response.json();
      console.log('[fetchHabits] Loaded', data.length, 'habits');
      setHabits(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知网络错误';
      console.error('[fetchHabits] Failed:', err);
      showError(`无法加载习惯列表（${msg}），请检查后端服务（node server.js）是否启动`);
      return [];
    }
  }, [showError]);

  const fetchWeeklyStats = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/stats/weekly');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 获取周统计失败`);
      }
      const data: DailyStats[] = await response.json();
      console.log('[fetchWeeklyStats] Loaded', data.length, 'days of stats');
      setDailyStats(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      console.error('[fetchWeeklyStats] Failed:', err);
      showError(`无法加载周统计数据（${msg}）`);
    }
  }, [showError]);

  const fetchHabitWeeklyCheckins = useCallback(async (habitId: string): Promise<boolean[]> => {
    try {
      const response = await fetch(`/api/habits/${habitId}/weekly-checkins`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: { date: string; checked: boolean }[] = await response.json();
      return data.map(item => !!item.checked);
    } catch (err) {
      console.error(`[fetchHabitWeeklyCheckins] Failed for habit ${habitId}:`, err);
      return [false, false, false, false, false, false, false];
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const habitsData = await fetchHabits();
      
      if (habitsData.length > 0) {
        await fetchWeeklyStats();
        
        const statusMap: { [habitId: string]: boolean[] } = {};
        for (const habit of habitsData) {
          const status = await fetchHabitWeeklyCheckins(habit._id);
          statusMap[habit._id] = status;
        }
        setHabitWeeklyStatus(statusMap);
      }
    } catch (unexpectedErr) {
      console.error('[fetchAllData] Unexpected error:', unexpectedErr);
      showError('加载数据时发生意外错误');
    } finally {
      window.setTimeout(() => setLoading(false), 250);
    }
  }, [fetchHabits, fetchWeeklyStats, fetchHabitWeeklyCheckins, showError]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleHabitCardClick = useCallback((habit: Habit) => {
    if (habit.isCheckedToday) return;
    setSelectedHabit(habit);
    setIsModalOpen(true);
  }, []);

  const handleOptimisticUpdate = useCallback((habitId: string) => {
    setHabits(prev => prev.map(h =>
      h._id === habitId ? { ...h, isCheckedToday: true } : h
    ));
  }, []);

  const handleCheckIn = useCallback(async (habitId: string, note: string): Promise<void> => {
    const habitBefore = habits.find(h => h._id === habitId);
    try {
      handleOptimisticUpdate(habitId);

      const response = await fetch(`/api/habits/${habitId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: note || '' }),
      });

      if (!response.ok) {
        let errorMsg = '打卡失败';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch { }
        throw new Error(errorMsg);
      }

      const checkInResult: CheckIn = await response.json();
      console.log('[handleCheckIn] Success:', checkInResult._id);

      const updatedStatus = await fetchHabitWeeklyCheckins(habitId);
      setHabitWeeklyStatus(prev => ({
        ...prev,
        [habitId]: updatedStatus,
      }));

      await fetchWeeklyStats();

      const habitAfter = habits.find(h => h._id === habitId);
      const habitName = habitAfter?.name || habitBefore?.name || '习惯';
      showSuccess(`「${habitName}」打卡成功！🎉`);
    } catch (err) {
      setHabits(prev => prev.map(h =>
        h._id === habitId ? { ...h, isCheckedToday: false } : h
      ));
      
      const msg = err instanceof Error ? err.message : '打卡失败，请稍后重试';
      console.error('[handleCheckIn] Failed:', err);
      showError(msg);
      throw err;
    }
  }, [habits, handleOptimisticUpdate, fetchHabitWeeklyCheckins, fetchWeeklyStats, showError, showSuccess]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedHabit(null);
  }, []);

  const formatDate = (date: Date) => {
    return format(date, 'yyyy年MM月dd日 EEEE', { locale: zhCN });
  };

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12