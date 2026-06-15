import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Board from './components/Board';
import StatsPanel, { StatsRange } from './components/StatsPanel';
import { usersApi, tasksApi, statsApi, type User, type Task, type TaskStatus, type MemberStats } from './api';

const COLUMN_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
const COLUMN_NAMES: Record<TaskStatus, string> = {
  todo: '待处理',
  in_progress: '进行中',
  review: '审核中',
  done: '已完成',
};

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statsRange, setStatsRange] = useState<StatsRange>('all');
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 1024);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [u, t, s] = await Promise.all([
        usersApi.getAll(),
        tasksApi.getAll(),
        statsApi.getMemberStats(statsRange),
      ]);
      setUsers(u);
      setTasks(t);
      setMemberStats(s);
    } catch (e: any) {
      setError(e.message || '加载数据失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statsRange]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const filteredTasks = useMemo(() => {
    if (!selectedUserId) return tasks;
    return tasks.filter((t) => t.assignee_id === selectedUserId);
  }, [tasks, selectedUserId]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updated = await tasksApi.updateStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      const s = await statsApi.getMemberStats(statsRange);
      setMemberStats(s);
    } catch (e: any) {
      console.error('更新状态失败', e);
      loadAllData();
    }
  }, [statsRange, loadAllData]);

  const handleTaskUpdate = useCallback(async (taskId: string, data: Partial<Task>) => {
    try {
      const updated = await tasksApi.update(taskId, data);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      const s = await statsApi.getMemberStats(statsRange);
      setMemberStats(s);
    } catch (e: any) {
      console.error('更新任务失败', e);
      loadAllData();
    }
  }, [statsRange, loadAllData]);

  const handleTaskCreate = useCallback(async (data: Partial<Task> & { title: string }) => {
    try {
      const created = await tasksApi.create(data);
      setTasks((prev) => [created, ...prev]);
      const s = await statsApi.getMemberStats(statsRange);
      setMemberStats(s);
    } catch (e: any) {
      console.error('创建任务失败', e);
      loadAllData();
    }
  }, [statsRange, loadAllData]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await tasksApi.remove(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      const s = await statsApi.getMemberStats(statsRange);
      setMemberStats(s);
    } catch (e: any) {
      console.error('删除任务失败', e);
      loadAllData();
    }
  }, [statsRange, loadAllData]);

  const getUserMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const columnCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
    filteredTasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [filteredTasks]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: 18, color: '#94a3b8' }}>
          <div style={{
            display: 'inline-block', width: 24, height: 24, border: '3px solid #3b82f6',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 1s linear infinite', marginRight: 12, verticalAlign: 'middle',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          TaskFleet 正在加载数据...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 18, color: '#ef4444' }}>❌ {error}</div>
        <button
          onClick={loadAllData}
          style={{
            padding: '8px 20px', background: '#3b82f6', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
          }}
        >
          重新加载
        </button>
      </div>
    );
  }

  const memberListEl = (
    <div style={styles.memberList(isMobile)}>
      <div style={styles.memberHeader}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>👥 团队成员</span>
        <button
          onClick={() => setSelectedUserId(null)}
          style={{
            ...styles.filterBtn,
            background: !selectedUserId ? '#3b82f6' : 'rgba(59,130,246,0.15)',
            color: !selectedUserId ? '#fff' : '#93c5fd',
          }}
        >
          全部
        </button>
      </div>
      <div style={styles.memberScroll(isMobile)}>
        {users.map((u) => {
          const active = selectedUserId === u.id;
          const userTasks = tasks.filter((t) => t.assignee_id === u.id);
          const doneCount = userTasks.filter((t) => t.status === 'done').length;
          return (
            <div
              key={u.id}
              onClick={() => setSelectedUserId(active ? null : u.id)}
              style={styles.memberItem(isMobile, active, u.color)}
              title={`${u.name} - 点击筛选`}
            >
              <div style={styles.avatar(u.color)}>
                {u.avatar || u.name.charAt(0)}
              </div>
              {!isMobile && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={styles.memberName}>{u.name}</div>
                  <div style={styles.memberProgress}>
                    <div style={{
                      fontSize: 11, color: '#94a3b8', marginBottom: 3,
                    }}>
                      {doneCount}/{userTasks.length} 完成
                    </div>
                    <div style={{
                      width: '100%', height: 4, background: 'rgba(148,163,184,0.2)',
                      borderRadius: 2, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: userTasks.length ? `${(doneCount / userTasks.length) * 100}%` : '0%',
                        height: '100%', background: u.color || '#3b82f6',
                        borderRadius: 2, transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const statsPanelEl = (
    <StatsPanel
      stats={memberStats}
      range={statsRange}
      onRangeChange={setStatsRange}
      collapsed={isMobile ? false : statsCollapsed}
      onToggleCollapse={() => isMobile ? setMobileDrawerOpen(false) : setStatsCollapsed((v) => !v)}
      isMobile={isMobile}
    />
  );

  return (
    <div style={styles.appRoot}>
      <header style={styles.header(isMobile)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={styles.logo}>🚀</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>TaskFleet</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>团队任务看板 · 工作量统计</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={styles.chip}>
            📋 共 {tasks.length} 个任务
          </div>
          <button
            onClick={() => {
              const title = prompt('请输入任务标题：');
              if (title && title.trim()) {
                handleTaskCreate({
                  title: title.trim(),
                  description: '',
                  status: 'todo',
                  estimated_hours: 4,
                  due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
                });
              }
            }}
            style={styles.primaryBtn}
          >
            + 新建任务
          </button>
          {isMobile && (
            <button
              onClick={() => setMobileDrawerOpen(true)}
              style={styles.iconBtn}
              title="查看统计"
            >
              📊
            </button>
          )}
        </div>
      </header>

      {isMobile ? (
        <div style={styles.mobileLayout}>
          {memberListEl}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Board
              tasks={filteredTasks}
              columnOrder={COLUMN_ORDER}
              columnNames={COLUMN_NAMES}
              columnCounts={columnCounts}
              users={users}
              userMap={getUserMap}
              onStatusChange={handleStatusChange}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
              isMobile={isMobile}
            />
          </div>
          {mobileDrawerOpen && (
            <>
              <div style={styles.drawerBackdrop} onClick={() => setMobileDrawerOpen(false)} />
              <div style={styles.drawer}>{statsPanelEl}</div>
            </>
          )}
        </div>
      ) : (
        <div style={styles.desktopLayout}>
          <div style={{ width: 200, flexShrink: 0, overflow: 'hidden' }}>
            {memberListEl}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Board
              tasks={filteredTasks}
              columnOrder={COLUMN_ORDER}
              columnNames={COLUMN_NAMES}
              columnCounts={columnCounts}
              users={users}
              userMap={getUserMap}
              onStatusChange={handleStatusChange}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
              isMobile={isMobile}
            />
          </div>
          {statsPanelEl}
        </div>
      )}
    </div>
  );
};

const styles = {
  appRoot: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
  } as React.CSSProperties,
  header: (isMobile: boolean) => ({
    height: 64,
    flexShrink: 0,
    padding: `0 ${isMobile ? 12 : 24}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(30,41,59,0.85)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(148,163,184,0.1)',
    zIndex: 10,
  }) as React.CSSProperties,
  logo: {
    width: 40, height: 40,
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20,
  } as React.CSSProperties,
  chip: {
    padding: '6px 14px',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.25)',
    color: '#93c5fd',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
  } as React.CSSProperties,
  primaryBtn: {
    padding: '8px 18px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  iconBtn: {
    width: 36, height: 36,
    background: 'rgba(59,130,246,0.15)',
    color: '#93c5fd',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 16,
  } as React.CSSProperties,
  desktopLayout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    gap: 1,
    background: 'rgba(148,163,184,0.05)',
  } as React.CSSProperties,
  mobileLayout: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  } as React.CSSProperties,
  memberList: (isMobile: boolean) => ({
    background: 'rgba(30,41,59,0.6)',
    borderRight: isMobile ? 'none' : '1px solid rgba(148,163,184,0.08)',
    borderBottom: isMobile ? '1px solid rgba(148,163,184,0.08)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }) as React.CSSProperties,
  memberHeader: {
    padding: '16px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  } as React.CSSProperties,
  filterBtn: {
    padding: '4px 12px',
    border: 'none',
    borderRadius: 16,
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s',
  } as React.CSSProperties,
  memberScroll: (isMobile: boolean) => ({
    overflowY: isMobile ? 'hidden' : 'auto',
    overflowX: isMobile ? 'auto' : 'hidden',
    padding: isMobile ? '0 12px 12px' : '0 12px 16px',
    display: isMobile ? 'flex' : 'flex',
    flexDirection: isMobile ? 'row' : 'column',
    gap: 6,
    flexShrink: 0,
    flexWrap: isMobile ? 'nowrap' : 'nowrap',
  }) as React.CSSProperties,
  memberItem: (isMobile: boolean, active: boolean, color: string) => ({
    padding: isMobile ? '8px 10px' : '10px 12px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    background: active ? `${color}22` : 'transparent',
    border: active ? `1px solid ${color}55` : '1px solid transparent',
    transition: 'all 0.2s',
    flexShrink: 0,
    minWidth: isMobile ? 'auto' : 'unset',
    flexDirection: isMobile ? 'column' : 'row',
    gap_x: undefined as any,
    whiteSpace: isMobile ? 'nowrap' : 'normal',
  }) as React.CSSProperties,
  avatar: (color: string) => ({
    width: 36, height: 36,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 14,
    boxShadow: `0 2px 6px ${color}44`,
    flexShrink: 0,
  }) as React.CSSProperties,
  memberName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,
  memberProgress: {
    minWidth: 0,
  } as React.CSSProperties,
  drawerBackdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 50,
  } as React.CSSProperties,
  drawer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '75vh',
    background: '#1e293b',
    borderTop: '1px solid rgba(148,163,184,0.15)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 60,
    overflow: 'hidden',
    animation: 'slideUp 0.3s ease-out',
  } as React.CSSProperties,
};

export default App;
