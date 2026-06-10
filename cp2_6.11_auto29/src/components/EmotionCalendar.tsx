import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Story, EMOTION_COLORS, EMOTION_LABELS } from '../types';
import { useStore } from '../store/useStore';
import { getWeekDates, WEEKDAY_LABELS, formatDate, getRelativeTime } from '../utils/time';
import { getHeatmapColor } from '../utils/emotion';  // ★ 热力图色阶函数 (HSL插值)
import { api } from '../utils/api';

/**
 * ★★★ 情绪日历热力图组件 ★★★
 * 功能点3: 每个格子颜色根据故事数量平滑过渡
 *         浅灰蓝 (#D0D8E8, 0条) → 深紫红 (#8B2252, 5条+)
 *         调用 getHeatmapColor(count) → 内部用 interpolateHsl HSL插值
 */
export default function EmotionCalendar() {
  const { calendarData, loadCalendarData } = useStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayStories, setDayStories] = useState<Story[]>([]);
  const navigate = useNavigate();

  useEffect(() => { loadCalendarData(); }, [loadCalendarData]);

  const weeks = getWeekDates(4);  // 4周 × 7天 = 28格

  // 点击某个日期 → 加载当天故事
  useEffect(() => {
    if (selectedDate) {
      api.getStoriesByDate(selectedDate).then(setDayStories);
    } else {
      setDayStories([]);
    }
  }, [selectedDate]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: 24
    }}>
      {/* 左侧：热力图 */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, fontFamily: "'Noto Serif SC', serif" }}>
          📅 情绪热力图
        </h3>

        {/* 周标签表头 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '30px repeat(4, 40px)',
          gap: 4, marginBottom: 8
        }}>
          <div />
          {weeks.map((week, i) => {
            const monday = week[0];
            return (
              <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                {monday.getMonth() + 1}/{monday.getDate()}
              </div>
            );
          })}
        </div>

        {/* 7行4列格子 */}
        {WEEKDAY_LABELS.map((day, dayIdx) => (
          <div
            key={day}
            style={{
              display: 'grid',
              gridTemplateColumns: '30px repeat(4, 40px)',
              gap: 4, alignItems: 'center', marginBottom: 4
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{day}</span>

            {weeks.map((week, weekIdx) => {
              const date = week[dayIdx];
              const dateStr = formatDate(date);
              const count = calendarData?.[dateStr]?.count ?? 0;
              const today = formatDate(new Date()) === dateStr;
              const selected = selectedDate === dateStr;

              // ★★★ 3. 色阶计算：HSL插值 #D0D8E8 → #8B2252 ★★★
              const bg = getHeatmapColor(count);

              return (
                <button
                  key={weekIdx}
                  onClick={() => setSelectedDate(dateStr)}
                  title={`${dateStr}：${count} 个故事`}
                  style={{
                    width: 40, height: 40, borderRadius: 8, padding: 0,
                    border:
                      selected ? '2px solid var(--text-primary)' :
                      today ? '2px solid #FFD700' :
                      'none',
                    // ★★★ 3. 平滑色阶背景色 ★★★
                    background: bg,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: 11,
                    color: count > 2 ? '#fff' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 500, transform: 'scale(1)'
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

        {/* 色阶图例 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 16, fontSize: 11, color: 'var(--text-muted)'
        }}>
          <span>少</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[0, 1, 2, 3, 4, 5].map(n => (
              <span key={n} style={{
                width: 16, height: 16, borderRadius: 3, display: 'inline-block',
                // ★★★ 3. 图例色阶同样使用 getHeatmapColor ★★★
                background: getHeatmapColor(n)
              }} />
            ))}
          </div>
          <span>多</span>
        </div>
      </div>

      {/* 右侧：选中日期的故事列表 */}
      <div className="glass-card" style={{ padding: 20, minHeight: 300 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, fontFamily: "'Noto Serif SC', serif" }}>
          {selectedDate ? `📖 ${selectedDate} 的故事` : '👈 选择日期查看故事'}
        </h3>

        {selectedDate ? (
          dayStories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayStories.map(s => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/story/${s.id}`)}
                  style={{
                    padding: 12, borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    borderLeft: `3px solid ${EMOTION_COLORS[s.emotion]}`,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: EMOTION_COLORS[s.emotion]
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {s.title}
                    </span>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 8,
                      background: `${EMOTION_COLORS[s.emotion]}22`,
                      color: EMOTION_COLORS[s.emotion]
                    }}>{EMOTION_LABELS[s.emotion]}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {getRelativeTime(s.createdAt)} · 💬 {s.replyCount} 条回响
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
