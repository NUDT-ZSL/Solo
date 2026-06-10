import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { EMOTION_COLORS, EMOTION_LABELS, EmotionType, CalendarData } from '../types';
import StatsCard from '../components/StatsCard';
import EmotionCalendar from '../components/EmotionCalendar';
import EmotionPieChart from '../components/EmotionPieChart';

export default function ProfilePage() {
  const { userStats, calendarData, loadUserStats, loadCalendarData } = useStore();

  useEffect(() => {
    loadUserStats();
    loadCalendarData();
  }, [loadUserStats, loadCalendarData]);

  const weeklyEmotions = useMemo(() => {
    const result: Record<EmotionType, number> = {
      joy: 0, sadness: 0, nostalgia: 0, confusion: 0, surprise: 0
    };
    if (!calendarData) return result;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

    for (let i = 0; i < 7; i++) {
      const date = new Date(thisMonday.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const day = calendarData[dateStr];
      if (day?.emotions) {
        Object.entries(day.emotions).forEach(([k, v]) => {
          result[k as EmotionType] += v;
        });
      }
    }
    return result;
  }, [calendarData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFD700 0%, #FF6B6B 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
        }}>
          👤
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontFamily: "'Noto Serif SC', serif" }}>我的树洞</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>记录每一刻的情绪变化</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
      }}>
        <StatsCard icon="📝" label="总故事数" value={userStats?.totalStories ?? 0} color="#FFD700" />
        <StatsCard icon="💬" label="总回响数" value={userStats?.totalReplies ?? 0} color="#4A90D9" />
        <StatsCard
          icon={userStats ? `${EMOTION_LABELS[userStats.mostCommonEmotion]}${EMOTION_LABELS[userStats.mostCommonEmotion] ? '' : ''}` : '😊'}
          label="最常情绪"
          value={userStats ? EMOTION_LABELS[userStats.mostCommonEmotion] : '--'}
          color={userStats ? EMOTION_COLORS[userStats.mostCommonEmotion] : undefined}
        />
        <StatsCard icon="🔥" label="连续记录" value={`${userStats?.streakDays ?? 0}天`} color="#E67E22" />
      </div>

      <EmotionCalendar />

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 20, fontFamily: "'Noto Serif SC', serif" }}>
          🥧 本周情绪分布
        </h3>
        <EmotionPieChart data={weeklyEmotions} size={220} />
      </div>
    </div>
  );
}
