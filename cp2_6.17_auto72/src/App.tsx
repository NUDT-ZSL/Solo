import React, { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, LogEntry, FilterState } from './types';
import TimerCard from './components/TimerCard';
import LogChart from './components/LogChart';
import { formatDate, filterByRange } from './utils/dateUtils';

interface AppContextType {
  projects: Project[];
  logs: LogEntry[];
  addProject: (project: Omit<Project, 'id' | 'color'>) => void;
  addLog: (log: Omit<LogEntry, 'id'>) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  getAverageDuration: (projectId: string) => number;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

const PREDEFINED_TAGS = ['React', 'Python', 'Rust', 'TypeScript', 'JavaScript', 'Vue', 'Go', 'C++', 'Java', 'Node.js', 'Django', 'Flask', 'Next.js', 'TailwindCSS'];
const PROJECT_COLORS = ['#f0f4ff', '#fff5f0', '#f0fff4', '#fff8f0', '#f5f0ff', '#f0faff'];

const STORAGE_KEY = 'dev_timer_dashboard_data';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).projects || []; } catch {}
    }
    return [
      { id: uuidv4(), name: 'React学习', tags: ['React', 'TypeScript'], targetDuration: 60, color: PROJECT_COLORS[0] },
      { id: uuidv4(), name: 'Python算法', tags: ['Python'], targetDuration: 45, color: PROJECT_COLORS[1] },
      { id: uuidv4(), name: 'Rust探索', tags: ['Rust'], targetDuration: 30, color: PROJECT_COLORS[2] }
    ];
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).logs || []; } catch {}
    }
    return [];
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({ dateRange: 'week' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', tags: [] as string[], customTag: '', targetDuration: 60 });
  const [showAchievement, setShowAchievement] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, logs }));
  }, [projects, logs]);

  const addProject = (p: Omit<Project, 'id' | 'color'>) => {
    const newP: Project = {
      ...p,
      id: uuidv4(),
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length]
    };
    setProjects(prev => [...prev, newP]);
  };

  const addLog = (log: Omit<LogEntry, 'id'>) => {
    const entry: LogEntry = { ...log, id: uuidv4() };
    setLogs(prev => [...prev, entry]);

    const projectHistoryLogs = logs.filter(l => l.projectId === log.projectId);
    const averageDuration = projectHistoryLogs.length > 0
      ? projectHistoryLogs.reduce((sum, l) => sum + l.duration, 0) / projectHistoryLogs.length
      : 0;

    if (averageDuration <= 0) {
      return;
    }
    if (log.duration > averageDuration * 1.5) {
      setShowAchievement(true);
    }
  };

  const getAverageDuration = (projectId: string): number => {
    const projectLogs = logs.filter(l => l.projectId === projectId);
    if (projectLogs.length === 0) return 0;
    return projectLogs.reduce((sum, l) => sum + l.duration, 0) / projectLogs.length;
  };

  const today = formatDate(new Date());
  const todayMinutes = useMemo(() => {
    return logs
      .filter(l => l.date.startsWith(today))
      .reduce((sum, l) => sum + l.duration, 0);
  }, [logs, today]);

  const totalTargetMinutes = useMemo(() => {
    return projects.reduce((sum, p) => sum + p.targetDuration, 0);
  }, [projects]);

  const progress = totalTargetMinutes > 0 ? Math.min(100, (todayMinutes / totalTargetMinutes) * 100) : 0;

  const filteredLogs = useMemo(() => filterByRange(logs, filter), [logs, filter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => p.tags.forEach(t => set.add(t)));
    return Array.from(set);
  }, [projects]);

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const interpolateColor = (colorA: string, colorB: string, t: number): string => {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    const clampedT = Math.max(0, Math.min(1, t));
    return rgbToHex(
      a.r + (b.r - a.r) * clampedT,
      a.g + (b.g - a.g) * clampedT,
      a.b + (b.b - a.b) * clampedT
    );
  };

  const getProgressColor = (pct: number): string => {
    const normalizedPct = Math.max(0, Math.min(100, pct)) / 100;
    return interpolateColor('#4caf50', '#ff7043', normalizedPct);
  };

  const getMotivationText = (pct: number): string => {
    if (pct >= 100) return '太棒了！今日目标已全部达成！🎉';
    if (pct >= 80) return `已完成${Math.round(pct)}%，胜利在望！`;
    if (pct >= 50) return `已完成${Math.round(pct)}%，继续加油！`;
    if (pct >= 25) return `已完成${Math.round(pct)}%，坚持就是胜利！`;
    if (pct > 0) return `已完成${Math.round(pct)}%，开始学习吧！`;
    return '今日还未开始，开启第一段专注时光吧！';
  };

  const handleAddProject = () => {
    if (!newProject.name.trim()) return;
    addProject({
      name: newProject.name.trim(),
      tags: newProject.tags.length > 0 ? newProject.tags : ['未分类'],
      targetDuration: newProject.targetDuration
    });
    setNewProject({ name: '', tags: [], customTag: '', targetDuration: 60 });
    setShowAddModal(false);
  };

  const toggleTag = (tag: string) => {
    setNewProject(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const addCustomTag = () => {
    const tag = newProject.customTag.trim();
    if (tag && !newProject.tags.includes(tag)) {
      setNewProject(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
        customTag: ''
      }));
    }
  };

  return (
    <AppContext.Provider value={{ projects, logs, addProject, addLog, selectedProjectId, setSelectedProjectId, getAverageDuration }}>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-content">
            <button
              className="hamburger-btn"
              onClick={() => setHamburgerOpen(!hamburgerOpen)}
              aria-label="菜单"
            >
              <span className={`hamburger-line ${hamburgerOpen ? 'open1' : ''}`}></span>
              <span className={`hamburger-line ${hamburgerOpen ? 'open2' : ''}`}></span>
              <span className={`hamburger-line ${hamburgerOpen ? 'open3' : ''}`}></span>
            </button>
            <h1 className="nav-title">📊 编程学习计时看板</h1>
            <div className={`nav-menu ${hamburgerOpen ? 'mobile-open' : ''}`}>
              <span className="nav-stat">今日: {todayMinutes}分钟</span>
              <span className="nav-stat">项目: {projects.length}</span>
              <span className="nav-stat">日志: {logs.length}条</span>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <section className="progress-section card">
            <div className="progress-header">
              <h2>今日进度</h2>
              <span className="progress-stats">{todayMinutes} / {totalTargetMinutes} 分钟</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progress}%`,
                  backgroundColor: getProgressColor(progress),
                  transition: 'background-color 0.5s ease, width 0.5s ease'
                }}
              />
            </div>
            <p className="motivation-text" key={progress}>
              {getMotivationText(progress)}
            </p>
          </section>

          <section className="projects-section">
            <div className="section-header">
              <h2>学习项目</h2>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + 添加项目
              </button>
            </div>
            <div className="projects-grid">
              {projects.map(project => (
                <TimerCard key={project.id} project={project} />
              ))}
              {projects.length === 0 && (
                <div className="empty-state">
                  <p>还没有项目，点击右上角"添加项目"开始吧！</p>
                </div>
              )}
            </div>
          </section>

          <section className="charts-section card">
            <div className="section-header">
              <h2>数据可视化报告</h2>
            </div>
            <div className="filter-controls">
              <div className="filter-group">
                <label>日期范围：</label>
                <div className="btn-group">
                  {(['today', 'week', 'month', 'custom'] as const).map(range => (
                    <button
                      key={range}
                      className={`btn-filter ${filter.dateRange === range ? 'active' : ''}`}
                      onClick={() => setFilter(f => ({ ...f, dateRange: range }))}
                    >
                      {range === 'today' ? '今天' : range === 'week' ? '本周' : range === 'month' ? '本月' : '自定义'}
                    </button>
                  ))}
                </div>
              </div>
              {filter.dateRange === 'custom' && (
                <div className="filter-group">
                  <label>自定义：</label>
                  <input
                    type="date"
                    className="input-field"
                    value={filter.customStart || ''}
                    onChange={e => setFilter(f => ({ ...f, customStart: e.target.value }))}
                  />
                  <span>至</span>
                  <input
                    type="date"
                    className="input-field"
                    value={filter.customEnd || ''}
                    onChange={e => setFilter(f => ({ ...f, customEnd: e.target.value }))}
                  />
                </div>
              )}
              <div className="filter-group">
                <label>技术栈：</label>
                <select
                  className="input-field"
                  value={filter.tag || ''}
                  onChange={e => setFilter(f => ({ ...f, tag: e.target.value || undefined }))}
                >
                  <option value="">全部</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            <LogChart logs={filteredLogs} projects={projects} filter={filter} />
          </section>
        </main>

        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>添加新项目</h3>
              <div className="form-group">
                <label>项目名称</label>
                <input
                  type="text"
                  className="input-underline"
                  placeholder="例如：学习React Hooks"
                  value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>技术栈标签</label>
                <div className="tag-selector">
                  {PREDEFINED_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-btn ${newProject.tags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="custom-tag-row">
                  <input
                    type="text"
                    className="input-underline"
                    placeholder="自定义标签..."
                    value={newProject.customTag}
                    onChange={e => setNewProject(p => ({ ...p, customTag: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                  />
                  <button type="button" className="btn btn-secondary" onClick={addCustomTag}>添加</button>
                </div>
                {newProject.tags.length > 0 && (
                  <div className="selected-tags">
                    已选：{newProject.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>每日目标时长（分钟）</label>
                <input
                  type="number"
                  min="1"
                  className="input-underline"
                  value={newProject.targetDuration}
                  onChange={e => setNewProject(p => ({ ...p, targetDuration: parseInt(e.target.value) || 60 }))}
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
                <button className="btn btn-primary" onClick={handleAddProject}>确认添加</button>
              </div>
            </div>
          </div>
        )}

        {showAchievement && (
          <div className="modal-overlay" onClick={() => setShowAchievement(false)}>
            <div className="achievement-modal" onClick={e => e.stopPropagation()}>
              <div className="trophy-icon">🎉</div>
              <h3 className="achievement-title">专注力爆棚</h3>
              <p className="achievement-desc">本次学习时长超过平均水平的150%！继续保持！</p>
              <button className="btn btn-primary btn-large" onClick={() => setShowAchievement(false)}>
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;
