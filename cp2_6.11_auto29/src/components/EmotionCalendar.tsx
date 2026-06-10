import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Story, EMOTION_COLORS, EMOTION_LABELS } from '../types';
import { useStore } from '../store/useStore';
import { getWeekDates, WEEKDAY_LABELS, formatDate, getRelativeTime } from '../utils/time';
import { getHeatmapColor } from '../utils/emotion';
import { api } from '../utils/api';

export default function EmotionCalendar() {
  const { calendarData, loadCalendarData } = useStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayStories, setDayStories] = useState<Story[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const weeks = getWeekDates(4);

  useEffect(() => {
    if (selectedDate) {
      api.getStoriesByDate(selectedDate).then(setDayStories);
    } else {
      setDayStories([]);
    }
  }, [selectedDate]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24 }}>
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, fontFamily: "'Noto Serif SC', serif" }}>
          📅 情绪热力图
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '30px repeat(4, 40px)', gap: 4, marginBottom: 8 }}>
            <div />
            {weeks.map((week, i) => {
              const monday = week[0];
              const label = `${monday.getMonth() + 1}/${monday.getDate()}`;
              return (
                <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {label}
                </div>
              );
            })}
          </div>

          {WEEKDAY_LABELS.map((day, dayIndex) => (
            <div key={day} style={{ display: 'grid', gridTemplateColumns: '30px repeat(4, 40px)', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{day}</span>
              {weeks.map((week, weekIndex) => {
                const date = week[dayIndex];
                const dateStr = formatDate(date);
                const dayData = calendarData?.[dateStr];
                const count = dayData?.count || 0;
                const bgColor = getHeatmapColor(count);
                const isSelected = selectedDate === dateStr;
                const isToday = formatDate(new Date()) === dateStr;

                return (
                  <button
                    key={weekIndex}
                    onClick={() => setSelectedDate(dateStr)}
                    title={`${dateStr}: ${count}个故事`}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      border: isSelected ? '2px solid var(--text-primary)' : isToday ? '2px solid #FFD700' : 'none',
                      background: bgColor,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: 'scale(1)',
                      fontSize: 11,
                      color: count > 2 ? '#fff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 500,
                      padding: 0
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {count > 0 ? count : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>少</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[0, 1, 2, 3, 4, 5].map(n => (
              <span
                key={n}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: getHeatmapColor(n),
                  display: 'inline-block'
                }}
              />
            ))}
          </div>
          <span>多</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20, minHeight: 300 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, fontFamily: "'Noto Serif SC', serif" }}>
          {selectedDate ? `📖 ${selectedDate} 的故事` : '👈 选择日期查看故事'}
        </h3>

        {selectedDate ? (
          dayStories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayStories.map(story => (
                <div
                  key={story.id}
                  onClick={() => navigate(`/story/${story.id}`)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderLeft: `3px solid ${EMOTION_COLORS[story.emotion]}`
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: EMOTION_COLORS[story.emotion]
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {story.title}
                    </span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: `${EMOTION_COLORS[story.emotion]}22`, color: EMOTION_COLORS[story.emotion] }}>
                      {EMOTION_LABELS[story.emotion]}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {getRelativeTime(story.createdAt)} · 💬 {story.replyCount} 条回响
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
              🌙 这天没有故事
            </div>
          )
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            点击左侧日历格子查看当天故事
          </div>
        )}
      </div>
    </div>
  );
}
