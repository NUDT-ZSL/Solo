import { useMemo } from 'react';
import HeatmapCalendar from './HeatmapCalendar';
import { getDailyRecord, getCompletedTasks } from '../logic/dataStore';
import type { Track } from '../api/backend';

interface AchievementPageProps {
  tracks: Track[];
  streakDays: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  max?: number;
  color: string;
}

export default function AchievementPage({ tracks, streakDays }: AchievementPageProps) {
  const dailyRecord = getDailyRecord();
  const completedSet = getCompletedTasks();

  const totalMinutes = useMemo(
    () => Object.values(dailyRecord).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0),
    [dailyRecord]
  );

  const totalDays = useMemo(
    () => Object.keys(dailyRecord).filter(k => {
      const v = dailyRecord[k];
      return typeof v === 'number' && v > 0;
    }).length,
    [dailyRecord]
  );

  const completedCount = completedSet.size;

  const achievements: Achievement[] = useMemo(() => {
    return [
      {
        id: 'first_practice',
        title: '初次练琴',
        description: '完成第一次练习打卡',
        icon: '🎯',
        unlocked: totalDays >= 1,
        progress: Math.min(1, totalDays),
        max: 1,
        color: '#10B981',
      },
      {
        id: 'week_streak',
        title: '七天坚持',
        description: '连续打卡7天',
        icon: '🔥',
        unlocked: streakDays >= 7,
        progress: streakDays,
        max: 7,
        color: '#F59E0B',
      },
      {
        id: 'month_streak',
        title: '月度达人',
        description: '连续打卡30天',
        icon: '🏆',
        unlocked: streakDays >= 30,
        progress: streakDays,
        max: 30,
        color: '#EC4899',
      },
      {
        id: 'ten_tracks',
        title: '十曲精通',
        description: '完成10首曲目的练习',
        icon: '🎵',
        unlocked: completedCount >= 10,
        progress: completedCount,
        max: 10,
        color: '#8B5CF6',
      },
      {
        id: 'hour_total',
        title: '时光积累',
        description: '累计练习10小时',
        icon: '⏱️',
        unlocked: totalMinutes >= 600,
        progress: Math.floor(totalMinutes / 60),
        max: 10,
        color: '#3B82F6',
      },
      {
        id: 'thirty_hours',
        title: '琴艺精进',
        description: '累计练习30小时',
        icon: '🎹',
        unlocked: totalMinutes >= 1800,
        progress: Math.floor(totalMinutes / 60),
        max: 30,
        color: '#06B6D4',
      },
      {
        id: 'fifty_tracks',
        title: '曲目收藏家',
        description: '学习50首不同曲目',
        icon: '📚',
        unlocked: tracks.length >= 50,
        progress: tracks.length,
        max: 50,
        color: '#84CC16',
      },
      {
        id: 'perfect_week',
        title: '完美一周',
        description: '一周7天每天都打卡',
        icon: '✨',
        unlocked: totalDays >= 7,
        progress: Math.min(7, totalDays),
        max: 7,
        color: '#F97316',
      },
    ];
  }, [totalDays, streakDays, completedCount, totalMinutes, tracks.length]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="achievement-page">
      <div className="section-header">
        <h2>🏅 我的成就</h2>
        <p className="section-desc">记录你的练琴旅程，每一份坚持都值得被看见</p>
      </div>

      <div className="achievement-summary">
        <div className="summary-card summary-time">
          <div className="summary-icon">⏱️</div>
          <div className="summary-info">
            <div className="summary-value">{Math.floor(totalMinutes / 60)}<span className="summary-unit">小时{totalMinutes % 60}分</span></div>
            <div className="summary-label">总练习时长</div>
          </div>
        </div>
        <div className="summary-card summary-days">
          <div className="summary-icon">📅</div>
          <div className="summary-info">
            <div className="summary-value">{totalDays}<span className="summary-unit">天</span></div>
            <div className="summary-label">练习天数</div>
          </div>
        </div>
        <div className="summary-card summary-streak">
          <div className="summary-icon">🔥</div>
          <div className="summary-info">
            <div className="summary-value">{streakDays}<span className="summary-unit">天</span></div>
            <div className="summary-label">连续打卡</div>
          </div>
        </div>
        <div className="summary-card summary-badges">
          <div className="summary-icon">🏆</div>
          <div className="summary-info">
            <div className="summary-value">{unlockedCount}<span className="summary-unit">/{achievements.length}</span></div>
            <div className="summary-label">成就徽章</div>
          </div>
        </div>
      </div>

      <div className="achievement-section">
        <h3 className="section-subtitle">📆 练习日历</h3>
        <div className="card-container">
          <HeatmapCalendar
            dailyMinutes={dailyRecord as Record<string, number>}
            currentStreak={streakDays}
            weeks={12}
          />
        </div>
      </div>

      <div className="achievement-section">
        <h3 className="section-subtitle">🎖️ 成就徽章</h3>
        <div className="achievements-grid">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`achievement-badge ${ach.unlocked ? 'unlocked' : 'locked'}`}
              style={{ borderColor: ach.unlocked ? ach.color : undefined }}
            >
              <div
                className="badge-icon"
                style={{
                  backgroundColor: ach.unlocked ? `${ach.color}20` : 'var(--bg-hover)',
                  boxShadow: ach.unlocked ? `0 0 20px ${ach.color}40` : 'none',
                }}
              >
                <span style={{ opacity: ach.unlocked ? 1 : 0.3 }}>{ach.icon}</span>
              </div>
              <div className="badge-info">
                <div className="badge-title" style={{ color: ach.unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {ach.title}
                </div>
                <div className="badge-desc">{ach.description}</div>
                {ach.progress !== undefined && ach.max !== undefined && !ach.unlocked && (
                  <div className="badge-progress">
                    <div
                      className="badge-progress-bar"
                      style={{
                        width: `${(ach.progress / ach.max) * 100}%`,
                        backgroundColor: ach.color,
                      }}
                    />
                    <span className="badge-progress-text">
                      {ach.progress} / {ach.max}
                    </span>
                  </div>
                )}
                {ach.unlocked && (
                  <div className="badge-unlocked">✓ 已解锁</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
