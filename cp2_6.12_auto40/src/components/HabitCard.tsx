import { useMemo } from 'react';
import type { HabitProgress } from '../types';
import { checkIn } from '../api/habits';

interface HabitCardProps {
  data: HabitProgress;
  index: number;
  isNew?: boolean;
  onCheckedIn?: () => void;
}

export default function HabitCard({ data, index, isNew, onCheckedIn }: HabitCardProps) {
  const { habit, todayValue, completed } = data;
  const progress = Math.min(100, (todayValue / habit.targetValue) * 100);
  const circumference = 2 * Math.PI * 30;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const frequencyText = useMemo(() => {
    if (habit.frequency === 'daily') return '每日';
    if (habit.frequency === 'weekly') return '每周';
    const dayMap = ['日', '一', '二', '三', '四', '五', '六'];
    return (habit.customDays || []).map((d) => '周' + dayMap[d]).join('、');
  }, [habit.frequency, habit.customDays]);

  const handleCheckIn = async () => {
    if (completed) return;
    try {
      await checkIn(habit.id, 1);
      onCheckedIn?.();
    } catch (err) {
      console.error('打卡失败:', err);
    }
  };

  return (
    <div
      className={`habit-card ${completed ? 'completed' : ''} ${isNew ? 'new-flip' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="habit-header">
        <div className="habit-info">
          <h3 className="habit-name">{habit.name}</h3>
          <div className="habit-meta">
            <span>📅 {frequencyText}</span>
            <span>🎯 {habit.targetValue} {habit.unit}</span>
            {habit.reminders.length > 0 && (
              <span className="reminders-tag">⏰ {habit.reminders.length}个提醒</span>
            )}
          </div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-info">
          <div className="progress-text">
            进度: {todayValue} / {habit.targetValue} {habit.unit} ({Math.round(progress)}%)
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="progress-ring-wrapper">
          <svg className="progress-ring" viewBox="0 0 72 72">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e94560" />
                <stop offset="100%" stopColor="#ff6b81" />
              </linearGradient>
            </defs>
            <circle className="progress-ring-bg" cx="36" cy="36" r="30" />
            <circle
              className="progress-ring-fill"
              cx="36"
              cy="36"
              r="30"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <button
            className={`progress-ring-center ${completed ? 'checked' : ''}`}
            onClick={handleCheckIn}
            title={completed ? '已完成' : '点击打卡'}
          >
            {completed ? '✓' : todayValue > 0 ? `+${Math.min(1, habit.targetValue - todayValue)}` : '+'}
          </button>
        </div>
      </div>
    </div>
  );
}
