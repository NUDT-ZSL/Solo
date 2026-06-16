import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PlanForm from './components/PlanForm';
import ProgressChart from './components/ProgressChart';
import TrackList from './components/TrackList';
import AchievementPage from './components/AchievementPage';
import type { Track, Feedback, Student } from './api/backend';
import { fetchTracks, fetchStudents, fetchFeedback, instrumentLabels, instrumentColors } from './api/backend';
import type { WeeklyPlan, WeeklyStats, DifficultyPreference } from './logic/planGenerator';
import { getPlan, calculateWeeklyStats } from './logic/planGenerator';
import {
  getCompletedTasks,
  toggleCompletedTask,
  getDailyRecord,
  getWeeklyPlan,
  saveWeeklyPlan,
  markFeedbackViewed,
} from './logic/dataStore';
import { useDebounce, useMediaQuery } from './hooks/useDebounce';

type NavKey = 'tracks' | 'plan' | 'stats' | 'feedback' | 'achievements';

const navItems: { key: NavKey; label: string; icon: string }[] = [
  { key: 'tracks', label: '曲目库', icon: '🎼' },
  { key: 'plan', label: '计划', icon: '📋' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'achievements', label: '成就', icon: '🏅' },
  { key: 'feedback', label: '反馈', icon: '💬' },
];

const dailyOptions = [15, 30, 45, 60];
const preferenceOptions: { value: DifficultyPreference; label: string }[] = [
  { value: 'easy', label: '轻松' },
  { value: 'moderate', label: '适中' },
  { value: 'challenge', label: '挑战' },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="avatar"
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? 'star filled' : 'star'}>★</span>
      ))}
    </span>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState<NavKey>('plan');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState<number>(30);
  const [preference, setPreference] = useState<DifficultyPreference>('moderate');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [_students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [newFeedbackBar, setNewFeedbackBar] = useState<Feedback | null>(null);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedSearch = useDebounce(searchKeyword, 200);
  const [filterInstrument, setFilterInstrument] = useState<string>('all');
  const feedbackTimerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const [tracksData, studentsData] = await Promise.all([fetchTracks(), fetchStudents()]);
      setTracks(tracksData);
      setStudents(studentsData);
      if (studentsData.length > 0) {
        setCurrentStudent(studentsData[0]);
        const fb = await fetchFeedback(studentsData[0].id);
        setFeedbacks(fb);
        const unread = fb.find(f => f.isNew);
        if (unread) {
          setNewFeedbackBar(unread);
        }
      }
    };
    init();
    const savedPlan = getWeeklyPlan();
    if (savedPlan) setPlan(savedPlan);
    setCompletedIds(getCompletedTasks());
  }, []);

  useEffect(() => {
    pollRef.current = window.setInterval(async () => {
      if (!currentStudent) return;
      const fb = await fetchFeedback(currentStudent.id);
      setFeedbacks(fb);
      const unread = fb.find(f => f.isNew);
      if (unread && unread.id !== newFeedbackBar?.id) {
        setNewFeedbackBar(unread);
      }
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentStudent, newFeedbackBar?.id]);

  useEffect(() => {
    if (newFeedbackBar) {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = window.setTimeout(() => {
        setNewFeedbackBar(null);
        setFeedbackExpanded(false);
      }, 3000);
    }
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [newFeedbackBar]);

  const handleGeneratePlan = useCallback(() => {
    const selectedTracks = tracks.filter(t => selectedTrackIds.includes(t.id));
    if (selectedTracks.length === 0) {
      alert('请至少选择一首曲目');
      return;
    }
    const newPlan = getPlan(selectedTracks, dailyMinutes, preference, currentStudent?.level || 2);
    setPlan(newPlan);
    saveWeeklyPlan(newPlan);
    setCompletedIds(new Set());
    setActiveNav('plan');
  }, [tracks, selectedTrackIds, dailyMinutes, preference, currentStudent]);

  const handleToggleTask = useCallback((taskId: string) => {
    const { set } = toggleCompletedTask(taskId);
    setCompletedIds(new Set(set));
  }, []);

  const handleToggleDay = useCallback((dayIndex: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  }, []);

  const handleFeedbackClick = useCallback((fb: Feedback) => {
    setFeedbackExpanded(prev => !prev);
    if (fb.isNew) {
      markFeedbackViewed(fb.id);
      setFeedbacks(prev => prev.map(f => f.id === fb.id ? { ...f, isNew: false } : f));
    }
  }, []);

  const handleCloseFeedbackBar = useCallback(() => {
    if (newFeedbackBar) {
      markFeedbackViewed(newFeedbackBar.id);
      setFeedbacks(prev => prev.map(f => f.id === newFeedbackBar.id ? { ...f, isNew: false } : f));
    }
    setNewFeedbackBar(null);
    setFeedbackExpanded(false);
  }, [newFeedbackBar]);

  const stats: WeeklyStats = useMemo(() => {
    if (!plan) return {
      totalMinutes: 0, completedTasks: 0, totalTasks: 0, streakDays: 0,
      dailyMinutes: [], dailyTracksCompleted: [], completionPercentage: 0,
    };
    return calculateWeeklyStats(plan, completedIds, getDailyRecord());
  }, [plan, completedIds]);

  const filteredTracks = useMemo(() => {
    const kw = debouncedSearch.trim().toLowerCase();
    return tracks.filter(t => {
      if (filterInstrument !== 'all' && t.instrument !== filterInstrument) return false;
      if (kw) {
        return t.title.toLowerCase().includes(kw) ||
          t.composer.toLowerCase().includes(kw) ||
          t.description.toLowerCase().includes(kw);
      }
      return true;
    });
  }, [tracks, debouncedSearch, filterInstrument]);

  const groupedTracks = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    filteredTracks.forEach(t => {
      const key = t.instrument;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTracks]);

  return (
    <div className="app-container">
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo">
          <span className="logo-icon">🎵</span>
          <span className="logo-text">练琴助手</span>
        </div>
        <nav className="nav-menu">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeNav === item.key ? 'active' : ''}`}
              onClick={() => { setActiveNav(item.key); setMobileMenuOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        {currentStudent && (
          <div className="student-info">
            <Avatar name={currentStudent.name} color={currentStudent.avatarColor} />
            <div className="student-detail">
              <div className="student-name">{currentStudent.name}</div>
              <div className="student-level">Lv.{currentStudent.level} · {instrumentLabels[currentStudent.instrument]}</div>
            </div>
          </div>
        )}
      </aside>

      <button className="hamburger" onClick={() => setMobileMenuOpen(v => !v)}>
        ☰
      </button>

      {mobileMenuOpen && <div className="overlay" onClick={() => setMobileMenuOpen(false)} />}

      <main className="main-content">
        {newFeedbackBar && (
          <div
            className={`feedback-bar ${feedbackExpanded ? 'expanded' : ''}`}
            onClick={() => handleFeedbackClick(newFeedbackBar)}
          >
            <div className="feedback-bar-header">
              <span className="feedback-emoji">{newFeedbackBar.emoji}</span>
              <span className="feedback-bar-teacher">{newFeedbackBar.teacherName} 的新反馈</span>
              <button className="feedback-close" onClick={(e) => { e.stopPropagation(); handleCloseFeedbackBar(); }}>✕</button>
            </div>
            {feedbackExpanded && (
              <div className="feedback-bar-content">{newFeedbackBar.content}</div>
            )}
          </div>
        )}

        {activeNav === 'tracks' && (
          <div className="content-section">
            <div className="section-header">
              <h2>📚 曲目库</h2>
              <p className="section-desc">共 {tracks.length} 首曲目，选择想练习的曲目加入计划</p>
            </div>
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="搜索曲目名、作曲家..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <select
                className="filter-select"
                value={filterInstrument}
                onChange={(e) => setFilterInstrument(e.target.value)}
              >
                <option value="all">全部乐器</option>
                {Object.entries(instrumentLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {selectedTrackIds.length > 0 && (
              <div className="selected-summary">
                已选择 <strong>{selectedTrackIds.length}</strong> 首曲目
              </div>
            )}
            <div className="tracks-container">
              <TrackList
                tracks={filteredTracks}
                selectedTrackIds={selectedTrackIds}
                onToggleTrack={(trackId) => {
                  setSelectedTrackIds(prev =>
                    prev.includes(trackId)
                      ? prev.filter(id => id !== trackId)
                      : [...prev, trackId]
                  );
                }}
              />
            </div>
          </div>
        )}

        {activeNav === 'plan' && (
          <div className="content-section">
            <div className="plan-layout">
              <div className="plan-sidebar">
                <PlanForm
                  tracks={tracks}
                  selectedTrackIds={selectedTrackIds}
                  setSelectedTrackIds={setSelectedTrackIds}
                  dailyMinutes={dailyMinutes}
                  setDailyMinutes={setDailyMinutes}
                  preference={preference}
                  setPreference={setPreference}
                  dailyOptions={dailyOptions}
                  preferenceOptions={preferenceOptions}
                  onGenerate={handleGeneratePlan}
                />
              </div>
              <div className="plan-main">
                <div className="section-header">
                  <h2>📋 本周练习计划</h2>
                  {plan && (
                    <p className="section-desc">
                      {plan.startDate} ~ {plan.endDate} · 共 {plan.totalTasks} 个任务 · {plan.totalDuration} 分钟
                    </p>
                  )}
                </div>
                {!plan ? (
                  <div className="empty-state big">
                    <div className="empty-icon">🎹</div>
                    <div className="empty-title">还没有练习计划</div>
                    <div className="empty-hint">请在左侧选择曲目并生成计划</div>
                  </div>
                ) : (
                  <div className="plan-days">
                    {plan.days.map(day => (
                      <div key={day.date} className={`plan-day ${expandedDays.has(day.dayIndex) ? 'expanded' : ''}`}>
                        <button
                          className="day-header"
                          onClick={() => handleToggleDay(day.dayIndex)}
                        >
                          <div className="day-header-left">
                            <span className="day-label">{day.label}</span>
                            <span className="day-duration">⏱ {day.totalDuration}分钟 · {day.tasks.length}项任务</span>
                          </div>
                          <span className={`day-arrow ${expandedDays.has(day.dayIndex) ? 'up' : ''}`}>▾</span>
                        </button>
                        <div className="day-tasks-wrapper">
                          <div className="day-tasks">
                            {day.tasks.map(task => {
                              const done = completedIds.has(task.id);
                              return (
                                <div
                                  key={task.id}
                                  className={`task-item ${done ? 'completed' : ''}`}
                                >
                                  <div className="task-line" />
                                  <label className="task-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={done}
                                      onChange={() => handleToggleTask(task.id)}
                                    />
                                    <span className="checkbox-custom" />
                                  </label>
                                  <div className="task-body">
                                    <div className="task-title">{task.title}</div>
                                    <div className="task-meta">
                                      <span className="task-duration">⏱ {task.duration}分钟</span>
                                      <span className="task-desc">{task.description}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeNav === 'stats' && (
          <div className="content-section">
            <div className="section-header">
              <h2>📊 练习统计</h2>
              <p className="section-desc">查看本周练习进度和数据</p>
            </div>
            <div className="stats-overview">
              <div className="stat-card time-card">
                <div className="stat-card-label">本周练习时长</div>
                <div className="stat-card-value">
                  <span className="big-num">{Math.floor(stats.totalMinutes / 60)}</span>
                  <span className="unit">小时</span>
                  <span className="big-num">{stats.totalMinutes % 60}</span>
                  <span className="unit">分钟</span>
                </div>
              </div>
              <div className="stat-card progress-card">
                <div className="ring-wrapper">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <defs>
                      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#2D2A4A" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="url(#ringGrad)" strokeWidth="10"
                      strokeDasharray={`${stats.completionPercentage * 3.14} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      className="ring-circle"
                    />
                    <text x="60" y="60" textAnchor="middle" dominantBaseline="middle"
                          className="ring-text">{stats.completionPercentage}%</text>
                  </svg>
                </div>
                <div className="stat-card-label" style={{ marginTop: 12 }}>任务完成度</div>
                <div className="progress-detail">
                  {stats.completedTasks} / {stats.totalTasks} 项
                </div>
              </div>
              <div className="stat-card streak-card">
                <div className="stat-card-label">连续打卡</div>
                <div className={`streak-display ${stats.streakDays >= 7 ? 'big-streak' : ''}`}>
                  <span className="streak-icon">🔥</span>
                  <span className="streak-num">{stats.streakDays}</span>
                  <span className="streak-unit">天</span>
                </div>
              </div>
            </div>
            <ProgressChart stats={stats} />
          </div>
        )}

        {activeNav === 'feedback' && (
          <div className="content-section">
            <div className="section-header">
              <h2>💬 教师反馈</h2>
              <p className="section-desc">查看老师给出的练习建议</p>
            </div>
            {feedbacks.length === 0 ? (
              <div className="empty-state big">
                <div className="empty-icon">💭</div>
                <div className="empty-title">暂无反馈</div>
                <div className="empty-hint">老师还没有给你写反馈哦</div>
              </div>
            ) : (
              <div className="feedback-timeline">
                {feedbacks.map((fb, idx) => (
                  <div key={fb.id} className={`timeline-item ${fb.isNew ? 'new' : ''}`}>
                    {idx < feedbacks.length - 1 && <div className="timeline-line" />}
                    <Avatar name={fb.teacherName} color="#8B5CF6" />
                    <div className="timeline-body">
                      <div className="timeline-header">
                        <span className="timeline-teacher">{fb.teacherName}</span>
                        {fb.isNew && <span className="timeline-badge">NEW</span>}
                        <span className="timeline-emoji">{fb.emoji}</span>
                      </div>
                      <div className="timeline-content">{fb.content}</div>
                    </div>
                    <div className="timeline-time">{formatTime(fb.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
