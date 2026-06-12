import { useState, useEffect, useCallback } from 'react';
import HabitCard from '../components/HabitCard';
import { fetchHabits } from '../api/habits';
import type { HabitProgress } from '../types';

interface HomePageProps {
  onAddClick: () => void;
}

export default function HomePage({ onAddClick }: HomePageProps) {
  const [habits, setHabits] = useState<HabitProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [newHabitIds, setNewHabitIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const loadHabits = useCallback(async () => {
    try {
      const data = await fetchHabits();
      setHabits(data);
      setDataReady(true);
    } catch (err) {
      console.error('加载习惯失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  useEffect(() => {
    const handleCreated = () => {
      setLoading(true);
      loadHabits().then(() => {
        setTimeout(() => {
          setHabits((prev) => {
            if (prev.length > 0) {
              const newId = prev[0].habit.id;
              setNewHabitIds((s) => new Set(s).add(newId));
              setTimeout(() => {
                setNewHabitIds((s) => {
                  const next = new Set(s);
                  next.delete(newId);
                  return next;
                });
              }, 800);
            }
            return prev;
          });
        }, 100);
      });
    };

    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSearchQuery(customEvent.detail || '');
    };

    window.addEventListener('habit:created', handleCreated);
    window.addEventListener('habit:search', handleSearch as EventListener);

    return () => {
      window.removeEventListener('habit:created', handleCreated);
      window.removeEventListener('habit:search', handleSearch as EventListener);
    };
  }, [loadHabits]);

  const handleCheckedIn = useCallback(() => {
    loadHabits();
  }, [loadHabits]);

  const filteredHabits = habits.filter(
    (h) =>
      !searchQuery ||
      h.habit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalHabits = habits.length;
  const completedToday = habits.filter((h) => h.completed).length;
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const totalCheckIns = habits.reduce((sum, h) => sum + h.todayValue, 0);

  return (
    <div>
      <section className="intro-section">
        <h1 className="intro-title">让好习惯成为你的超能力 💪</h1>
        <p className="intro-subtitle">
          每天追踪进度，养成持续习惯。点击进度环中心完成今日打卡，见证自己的蜕变之旅。
        </p>

        <div className="stats-summary">
          <div className="summary-card">
            <div className="summary-value">{totalHabits}</div>
            <div className="summary-label">习惯总数</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{completedToday}/{totalHabits}</div>
            <div className="summary-label">今日完成</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{completionRate}%</div>
            <div className="summary-label">完成率</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{totalCheckIns}</div>
            <div className="summary-label">今日总打卡</div>
          </div>
        </div>
      </section>

      <section className="habits-section">
        <div className="section-header">
          <h2 className="section-title">我的习惯</h2>
          <button className="add-habit-btn" onClick={onAddClick}>
            + 创建新习惯
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : filteredHabits.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
            <h3 style={{ marginBottom: '8px' }}>
              {searchQuery ? '没有找到匹配的习惯' : '还没有习惯，开始创建第一个吧！'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {searchQuery ? '试试其他关键词' : '小习惯成就大未来'}
            </p>
            {!searchQuery && (
              <button className="add-habit-btn" onClick={onAddClick} style={{ margin: '0 auto' }}>
                + 创建第一个习惯
              </button>
            )}
          </div>
        ) : (
          <div className="habits-grid">
            {filteredHabits.map((h, i) => (
              <HabitCard
                key={h.habit.id}
                data={h}
                index={i}
                isNew={newHabitIds.has(h.habit.id)}
                dataReady={dataReady}
                onCheckedIn={handleCheckedIn}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
