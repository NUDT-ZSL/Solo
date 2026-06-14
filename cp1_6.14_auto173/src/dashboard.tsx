import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getGroups,
  getGroupById,
  subscribeToUpdates,
  type StudyGroup,
  type CheckInRecord
} from './mock-api';
import {
  processGroupData,
  formatMinutes,
  filterGroupRecords,
  getTopMembers,
  type AggregatedData,
  type RankedMember
} from './data-processor';
import './dashboard.css';

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 9 6 5 10" />
    <polyline points="21 15 18 15 18 12" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 15 18 19 14" />
    <polyline points="3 9 6 9 6 12" />
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

function RingProgress({ percentage, size = 200 }: { percentage: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const gradientId = useMemo(() => `ring-gradient-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <div className="ring-progress-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--ring-bg)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className="ring-progress-text">
        <span className="ring-progress-percentage">{percentage.toFixed(1)}%</span>
        <span className="ring-progress-label">完成率</span>
      </div>
    </div>
  );
}

const MemberBar = ({ member, maxMinutes }: { member: RankedMember; maxMinutes: number }) => {
  const [hovered, setHovered] = useState(false);
  const widthPercent = maxMinutes > 0 ? (member.weeklyMinutes / maxMinutes) * 100 : 0;

  return (
    <div
      className="member-bar-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="member-bar-info">
        <img src={member.avatarUrl} alt={member.name} className="member-bar-avatar" />
        <div className="member-bar-details">
          <span className="member-bar-name">{member.name}</span>
          <span className="member-bar-streak">🔥 连续 {member.streakDays} 天</span>
        </div>
      </div>
      <div className="member-bar-right">
        <div className="member-bar-track">
          <div
            className="member-bar-fill"
            style={{ width: `${widthPercent}%` }}
          />
        </div>
        <div className="member-bar-time">
          {hovered && (
            <span className="member-bar-tooltip">{formatMinutes(member.weeklyMinutes)}</span>
          )}
          {!hovered && <span>{(member.weeklyMinutes / 60).toFixed(1)}h</span>}
          {member.rankChange !== 0 && (
            <span className={`rank-change ${member.rankChange > 0 ? 'up' : 'down'}`}>
              {member.rankChange > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {Math.abs(member.rankChange)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const GroupCard = ({
  group,
  active,
  onClick
}: {
  group: StudyGroup;
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={`group-card ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="group-card-header">
        <span className="group-card-name">{group.name}</span>
        <span className="group-card-count">{group.members.length}人</span>
      </div>
      <p className="group-card-desc">{group.description}</p>
    </div>
  );
};

const TopThree = ({ members }: { members: RankedMember[] }) => {
  const top = getTopMembers(members, 3);
  const borderColors = ['#fbbf24', '#9ca3af', '#cd7f32'];

  return (
    <div className="top-three-container">
      <h3 className="panel-title">本周排行榜</h3>
      <div className="top-three-avatars">
        {top.map((member, index) => (
          <div key={member.id} className="top-three-item">
            <div className="top-three-avatar-wrapper">
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="top-three-avatar"
                style={{ borderColor: borderColors[index] }}
              />
              <span className="top-three-rank">{index + 1}</span>
            </div>
            <span className="top-three-name">{member.name}</span>
            <span className="top-three-time">{(member.weeklyMinutes / 60).toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CheckInFeed = ({ records }: { records: CheckInRecord[] }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [records.length]);

  return (
    <div className="checkin-feed-container">
      <h3 className="panel-title">最新动态</h3>
      <div className="checkin-feed-list" ref={listRef}>
        {records.map((record, index) => (
          <div key={`${record.timestamp}-${index}`} className="checkin-feed-item">
            <span className="checkin-feed-name">{record.memberName}</span>
            <span className="checkin-feed-text"> 学习了 </span>
            <span className="checkin-feed-duration">{record.duration} 分钟</span>
          </div>
        ))}
        {records.length === 0 && (
          <div className="checkin-feed-empty">暂无打卡记录</div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeGroup = useMemo(() => {
    if (!activeGroupId) return undefined;
    return getGroupById(activeGroupId);
  }, [activeGroupId, checkInRecords]);

  const aggregatedData: AggregatedData | null = useMemo(() => {
    if (!activeGroup) return null;
    return processGroupData(activeGroup);
  }, [activeGroup]);

  const groupRecords = useMemo(() => {
    return filterGroupRecords(checkInRecords, activeGroupId).reverse();
  }, [checkInRecords, activeGroupId]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const handleGroupSelect = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const initialGroups = getGroups();
    setGroups(initialGroups);
    if (initialGroups.length > 0) {
      setActiveGroupId(initialGroups[0].id);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToUpdates((records) => {
      setCheckInRecords(prev => {
        const newRecords = [...records, ...prev];
        return newRecords.slice(0, 50);
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app-container">
      <header className="top-navbar">
        <div className="navbar-left">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="菜单"
          >
            <MenuIcon />
          </button>
          <h1 className="app-title">StudyHive</h1>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="切换主题"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <div className="main-content">
        <aside className={`left-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>学习小组</h2>
          </div>
          <div className="group-list">
            {groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                active={group.id === activeGroupId}
                onClick={() => handleGroupSelect(group.id)}
              />
            ))}
          </div>
        </aside>

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="center-panel">
          {aggregatedData ? (
            <>
              <div className="panel-header">
                <h2 className="panel-main-title">{aggregatedData.groupName}</h2>
                <p className="panel-subtitle">
                  {activeGroup?.members.length} 名成员 · 周目标 {formatMinutes(aggregatedData.targetMinutes)}
                </p>
              </div>

              <div className="dashboard-stats">
                <div className="stat-card">
                  <RingProgress percentage={aggregatedData.completionRate} />
                </div>
                <div className="stats-info">
                  <div className="stat-item">
                    <span className="stat-value">{aggregatedData.membersRanked.length}</span>
                    <span className="stat-label">成员数</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{(aggregatedData.totalMinutes / 60).toFixed(1)}h</span>
                    <span className="stat-label">总学习时长</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{(aggregatedData.avgWeeklyMinutes / 60).toFixed(1)}h</span>
                    <span className="stat-label">人均时长</span>
                  </div>
                </div>
              </div>

              <div className="sprint-section">
                <h3 className="section-title">本周冲刺榜</h3>
                <div className="sprint-list">
                  {aggregatedData.membersRanked.map(member => (
                    <MemberBar
                      key={member.id}
                      member={member}
                      maxMinutes={aggregatedData.maxWeeklyMinutes}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="loading-state">加载中...</div>
          )}
        </main>

        <aside className="right-panel">
          {aggregatedData && (
            <>
              <TopThree members={aggregatedData.membersRanked} />
              <CheckInFeed records={groupRecords} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
