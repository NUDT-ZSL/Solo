import { useState, useEffect } from 'react';
import { Timer, Clock, BarChart3, Menu, X } from 'lucide-react';
import { useFocusStore } from './store';
import { getDateKey } from './types';
import TimerCard from './components/TimerCard';
import TimelineView from './components/TimelineView';
import Dashboard from './components/Dashboard';

type Tab = 'timer' | 'timeline' | 'dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const records = useFocusStore((s) => s.records);
  const todayKey = getDateKey(Date.now());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const navItems: { key: Tab; label: string; icon: typeof Timer }[] = [
    { key: 'timer', label: '计时器', icon: Timer },
    { key: 'timeline', label: '时间线', icon: Clock },
    { key: 'dashboard', label: '仪表盘', icon: BarChart3 },
  ];

  const handleNavClick = (key: Tab) => {
    setActiveTab(key);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-base font-sans">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${
          isMobile
            ? `fixed top-0 left-0 h-full z-40 transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'relative'
        } w-56 bg-surface flex flex-col shrink-0`}
      >
        <div className="px-5 py-6 border-b border-border">
          <h1 className="text-lg font-bold text-teal tracking-wide">FocusTracker</h1>
          <p className="text-xs text-textSub mt-1">专注度追踪器</p>
        </div>
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleNavClick(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-colors duration-150 ${
                activeTab === key
                  ? 'bg-teal/15 text-teal'
                  : 'text-textSub hover:bg-surfaceHover hover:text-text'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-textSub">今日记录: {records.filter((r) => getDateKey(r.startTime) === todayKey).length} 条</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {isMobile && (
          <div className="flex items-center px-4 py-3 bg-surface border-b border-border shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-textSub hover:text-text transition-colors"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="ml-3 text-sm font-medium text-text">
              {navItems.find((n) => n.key === activeTab)?.label}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          <TimerCard />
          <TimelineView />
          <Dashboard />
        </div>
      </main>
    </div>
  );
}
