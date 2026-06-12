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
    setError(message);
    setTimeout(() => setError(null), 3000);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 2000);
  }, []);

  const fetchHabits = useCallback(async () => {
    try {
      const response = await fetch('/api/habits');
      if (!response.ok) {
        throw new Error('获取习惯列表失败');
      }
      const data = await response.json();
      setHabits(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch habits:', err);
      showError('无法加载习惯列表，请检查后端服务是否启动');
      return [];
    }
  }, [showError]);

  const fetchWeeklyStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats/weekly');
      if (!response.ok) {
        throw new Error('获取周统计数据失败');
      }
      const data = await response.json();
      setDailyStats(data);
    } catch (err) {
      console.error('Failed to fetch weekly stats:', err);
      showError('无法加载统计数据');
    }
  }, [showError]);

  const fetchHabitWeeklyCheckins = useCallback(async (habitId: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/weekly-checkins`);
      if (!response.ok) {
        throw new Error('获取打卡状态失败');
      }
      const data = await response.json();
      return data.map((item: { date: string; checked: boolean }) => item.checked);
    } catch (err) {
      console.error(`Failed to fetch weekly checkins for habit ${habitId}:`, err);
      return [false, false, false, false, false, false, false];
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const habitsData = await fetchHabits();
      await fetchWeeklyStats();
      
      const statusMap: { [habitId: string]: boolean[] } = {};
      for (const habit of habitsData) {
        const status = await fetchHabitWeeklyCheckins(habit._id);
        statusMap[habit._id] = status;
      }
      setHabitWeeklyStatus(statusMap);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [fetchHabits, fetchWeeklyStats, fetchHabitWeeklyCheckins]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleHabitClick = useCallback((habit: Habit) => {
    if (!habit.isCheckedToday) {
      setSelectedHabit(habit);
      setIsModalOpen(true);
    }
  }, []);

  const handleCheckIn = useCallback(async (habitId: string, note: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '打卡失败');
      }

      const checkInResult: CheckIn = await response.json();
      console.log('Check-in successful:', checkInResult);

      setHabits(prev => prev.map(h => 
        h._id === habitId ? { ...h, isCheckedToday: true } : h
      ));

      const updatedStatus = await fetchHabitWeeklyCheckins(habitId);
      setHabitWeeklyStatus(prev => ({
        ...prev,
        [habitId]: updatedStatus,
      }));

      await fetchWeeklyStats();

      const habit = habits.find(h => h._id === habitId);
      showSuccess(`「${habit?.name || '习惯'}」打卡成功！🎉`);
    } catch (err) {
      console.error('Check-in failed:', err);
      const message = err instanceof Error ? err.message : '打卡失败，请稍后重试';
      showError(message);
      throw err;
    }
  }, [habits, fetchHabitWeeklyCheckins, fetchWeeklyStats, showSuccess, showError]);

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
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const completedTodayCount = habits.filter(h => h.isCheckedToday).length;
  const totalCount = habits.length;

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.appTitle}>HabitFlow</h1>
          <span style={styles.appSubtitle}>让习惯自然养成</span>
        </div>

        <div style={styles.greetingSection}>
          <div style={styles.greetingContent}>
            <span style={styles.greeting}>{getGreeting()} ☀️</span>
            <span style={styles.date}>{formatDate(today)}</span>
            <span style={styles.quote}>{quote}</span>
            {totalCount > 0 && (
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${(completedTodayCount / totalCount) * 100}%`,
                  }}
                />
                <span style={styles.progressText}>
                  今日进度 {completedTodayCount}/{totalCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={styles.errorToast}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {successMessage && (
          <div style={styles.successToast}>
            <span>{successMessage}</span>
          </div>
        )}

        <div style={styles.habitsSection}>
          <h2 style={styles.sectionTitle}>今日打卡</h2>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>加载中...</span>
            </div>
          ) : habits.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyEmoji}>🌱</span>
              <span style={styles.emptyText}>暂无习惯，请先启动后端服务</span>
              <button style={styles.retryButton} onClick={fetchAllData}>
                重新加载
              </button>
            </div>
          ) : (
            <div style={styles.habitsGrid}>
              {habits.map((habit) => (
                <HabitCard
                  key={habit._id}
                  habit={habit}
                  onClick={handleHabitClick}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && habits.length > 0 && dailyStats.length > 0 && (
          <div style={styles.timelineSection}>
            <WeeklyTimeline
              dailyStats={dailyStats}
              habits={habits}
              habitWeeklyStatus={habitWeeklyStatus}
            />
          </div>
        )}

        <div style={styles.footer}>
          <span style={styles.footerText}>💚 坚持每一天，见证更好的自己</span>
        </div>
      </div>

      <HabitModal
        habit={selectedHabit}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleCheckIn}
        onError={showError}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  container: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '20px 16px 40px',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  appTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#28a745',
    margin: 0,
    letterSpacing: '1px',
  },
  appSubtitle: {
    fontSize: '13px',
    color: '#6c757d',
    marginTop: '4px',
    display: 'block',
  },
  greetingSection: {
    background: 'linear-gradient(135deg, #d4edda 0%, #28a745 100%)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 20px rgba(40, 167, 69, 0.2)',
  },
  greetingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  greeting: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '8px',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  date: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: '12px',
  },
  quote: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  progressBar: {
    width: '100%',
    maxWidth: '320px',
    height: '32px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    transition: 'width 0.5s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '13px',
    fontWeight: 600,
    color: '#28a745',
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#343a40',
    margin: '0 0 16px 0',
  },
  habitsSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  habitsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px 16px',
    justifyContent: 'flex-start',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e9ecef',
    borderTopColor: '#28a745',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '12px',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6c757d',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  emptyEmoji: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '16px',
  },
  retryButton: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#28a745',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  timelineSection: {
    marginBottom: '24px',
  },
  errorToast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    color: '#c53030',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 2000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    animation: 'slideDown 0.3s ease',
  },
  successToast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#f0fff4',
    border: '1px solid #c6f6d5',
    color: '#22543d',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 2000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    animation: 'slideDown 0.3s ease',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 0',
  },
  footerText: {
    fontSize: '13px',
    color: '#6c757d',
  },
};

const styleSheetId = 'app-styles';
if (!document.getElementById(styleSheetId)) {
  const styleSheet = document.createElement('style');
  styleSheet.id = styleSheetId;
  styleSheet.textContent = `
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
    }
    
    #root {
      min-height: 100vh;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
    
    @media (max-width: 480px) {
      .habits-grid {
        justify-content: space-around !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default App;
