import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { useTasks } from './hooks/useTasks';
import { VirtualTaskList } from './components/VirtualTaskList';
import { UserCard } from './components/UserCard';
import { Timeline } from './components/Timeline';
import { Modal } from './components/Modal';
import { RegisterForm } from './components/RegisterForm';
import { CreateTaskForm } from './components/CreateTaskForm';
import type { User, Task } from './data/db';

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;
document.head.appendChild(styleSheet);

type BuildingFilter = 'all' | 'same' | string;

function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (data: { nickname: string; avatarUrl: string; building: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const newUser = await res.json();
        await fetchUsers();
        return newUser;
      }
      throw new Error('注册失败');
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  const refreshUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, fetchUsers, createUser, refreshUser };
}

function Header({
  currentUser,
  onLoginClick,
  onCreateTaskClick,
  onLogout
}: {
  currentUser: User | null;
  onLoginClick: () => void;
  onCreateTaskClick: () => void;
  onLogout: () => void;
}) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
        borderBottom: '1px solid #f3f4f6',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316, #f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#ffffff',
              fontWeight: 700
            }}
          >
            🏠
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>邻里互助</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '-2px' }}>Neighborhood Helper</div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <>
              <button
                onClick={onCreateTaskClick}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(249,115,22,0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(249,115,22,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(249,115,22,0.25)';
                }}
              >
                + 发布任务
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCard user={currentUser} isCurrentUser compact />
                <button
                  onClick={onLogout}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#6b7280',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  退出
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#f97316',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ea580c')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f97316')}
            >
              登录 / 注册
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function FilterButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: '20px',
        border: active ? '2px solid #f97316' : '1px solid #e5e7eb',
        background: active ? '#fff7ed' : '#ffffff',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: active ? 600 : 500,
        color: active ? '#f97316' : '#6b7280',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = '#fdba74';
          e.currentTarget.style.color = '#f97316';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.color = '#6b7280';
        }
      }}
    >
      {label}
    </button>
  );
}

function FilterBar({
  buildingFilter,
  setBuildingFilter,
  statusFilter,
  setStatusFilter,
  users,
  currentUser
}: {
  buildingFilter: BuildingFilter;
  setBuildingFilter: (b: BuildingFilter) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  users: User[];
  currentUser: User | null;
}) {
  const allBuildings = Array.from(new Set(users.map((u) => u.building))).sort();

  const buildingOptions: { key: string; label: string; value: BuildingFilter }[] = [
    { key: 'all', label: '全部楼栋', value: 'all' },
    ...(currentUser
      ? [{ key: 'same', label: `${currentUser.building}（同楼栋）`, value: 'same' as BuildingFilter }]
      : []),
    ...allBuildings
      .filter((b) => !currentUser || b !== currentUser.building)
      .map((b) => ({
        key: `b-${b}`,
        label: b,
        value: b as BuildingFilter
      }))
  ];

  const statuses = [
    { value: 'all', label: '全部' },
    { value: 'active', label: '待接单' },
    { value: 'in-progress', label: '进行中' },
    { value: 'completed', label: '已完成' }
  ];

  const isBuildingActive = (val: BuildingFilter) => {
    if (val === 'same' && currentUser) {
      return buildingFilter === 'same' || buildingFilter === currentUser.building;
    }
    return buildingFilter === val;
  };

  const handleBuildingClick = (val: BuildingFilter) => {
    if (val === 'same' && currentUser) {
      setBuildingFilter(currentUser.building);
    } else {
      setBuildingFilter(val);
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginRight: '4px' }}>楼栋:</span>
        {buildingOptions.map((b) => (
          <FilterButton
            key={b.key}
            active={isBuildingActive(b.value)}
            label={b.label}
            onClick={() => handleBuildingClick(b.value)}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginRight: '4px' }}>状态:</span>
        {statuses.map((s) => (
          <FilterButton
            key={s.value}
            active={statusFilter === s.value}
            label={s.label}
            onClick={() => setStatusFilter(s.value)}
          />
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('neighbor_user_id');
    } catch {
      return null;
    }
  });

  const { users, createUser, refreshUser } = useUsers();
  const [buildingFilter, setBuildingFilter] = useState<BuildingFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  let effectiveBuilding: string | undefined;
  if (buildingFilter === 'same' && currentUser) {
    effectiveBuilding = currentUser.building;
  } else if (buildingFilter !== 'all' && buildingFilter !== 'same') {
    effectiveBuilding = buildingFilter;
  } else {
    effectiveBuilding = undefined;
  }
  const effectiveStatus = statusFilter === 'all' ? undefined : statusFilter;

  const {
    data: tasks,
    acceptTask,
    completeTask,
    cancelTask,
    fetchTasks,
    error: taskError
  } = useTasks({
    building: effectiveBuilding,
    status: effectiveStatus
  });

  useEffect(() => {
    fetchTasks({ building: effectiveBuilding, status: effectiveStatus });
  }, [effectiveBuilding, effectiveStatus, fetchTasks]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleRegister = useCallback(
    async (data: { nickname: string; avatarUrl: string; building: string }) => {
      setFormLoading(true);
      try {
        const user = await createUser(data);
        if (user) {
          localStorage.setItem('neighbor_user_id', user.id);
          setCurrentUserId(user.id);
          setShowRegister(false);
          showToast(`欢迎加入，${user.nickname}！🎉`);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : '注册失败', 'error');
      } finally {
        setFormLoading(false);
      }
    },
    [createUser, showToast]
  );

  const handleCreateTask = useCallback(
    async (data: { type: string; title: string; description: string; expectedTime: string; rewardPoints: number }) => {
      if (!currentUserId) {
        showToast('请先登录', 'error');
        return;
      }
      setFormLoading(true);
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, publisherId: currentUserId })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '发布失败');
        }
        setShowCreateTask(false);
        await fetchTasks({ building: effectiveBuilding, status: effectiveStatus });
        showToast('任务发布成功！');
      } catch (e) {
        showToast(e instanceof Error ? e.message : '发布失败', 'error');
      } finally {
        setFormLoading(false);
      }
    },
    [currentUserId, fetchTasks, effectiveBuilding, effectiveStatus, showToast]
  );

  const handleAccept = useCallback(
    async (taskId: string) => {
      if (!currentUserId) {
        showToast('请先登录后再接单', 'error');
        setShowRegister(true);
        return;
      }
      try {
        await acceptTask(taskId, currentUserId);
        const task = tasks.find((t) => t.id === taskId);
        if (task && task.acceptorId) {
          await refreshUser(task.acceptorId);
        }
        showToast('接单成功！请尽快完成任务~');
      } catch (e) {
        showToast(e instanceof Error ? e.message : '接单失败', 'error');
      }
    },
    [currentUserId, acceptTask, tasks, refreshUser, showToast]
  );

  const handleComplete = useCallback(
    async (taskId: string) => {
      try {
        const task = tasks.find((t) => t.id === taskId);
        await completeTask(taskId);
        if (task) {
          if (task.publisherId) await refreshUser(task.publisherId);
          if (task.acceptorId) await refreshUser(task.acceptorId);
        }
        showToast('任务完成！积分已发放 ✨');
      } catch (e) {
        showToast(e instanceof Error ? e.message : '操作失败', 'error');
      }
    },
    [tasks, completeTask, refreshUser, showToast]
  );

  const handleCancel = useCallback(
    async (taskId: string) => {
      try {
        await cancelTask(taskId);
        showToast('任务已取消');
      } catch (e) {
        showToast(e instanceof Error ? e.message : '取消失败', 'error');
      }
    },
    [cancelTask, showToast]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem('neighbor_user_id');
    setCurrentUserId(null);
    showToast('已退出登录');
  }, [showToast]);

  const existingBuildings = useMemo(() => users.map((u) => u.building), [users]);

  return (
    <div>
      <Header
        currentUser={currentUser}
        onLoginClick={() => setShowRegister(true)}
        onCreateTaskClick={() => {
          if (!currentUserId) {
            showToast('请先登录', 'error');
            setShowRegister(true);
            return;
          }
          setShowCreateTask(true);
        }}
        onLogout={handleLogout}
      />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {currentUser && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              border: '1px solid #fed7aa'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  fontSize: '36px'
                }}
              >
                👋
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
                  你好，{currentUser.nickname}！
                </div>
                <div style={{ fontSize: '13px', color: '#b45309' }}>
                  {currentUser.building} · 信用积分：
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#f97316' }}>
                    {currentUser.creditScore}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/profile/${currentUser.id}`)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #f97316',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#f97316',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fff7ed')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              查看我的记录 →
            </button>
          </div>
        )}

        {taskError && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '16px'
            }}
          >
            ⚠️ {taskError}
          </div>
        )}

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <FilterBar
            buildingFilter={buildingFilter}
            setBuildingFilter={setBuildingFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            users={users}
            currentUser={currentUser}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px dashed #f3f4f6'
            }}
          >
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              共找到 <strong style={{ color: '#f97316' }}>{tasks.length}</strong> 个互助任务
            </div>
            {users.length > 0 && (
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                社区成员: {users.length} 人
              </div>
            )}
          </div>
        </div>

        <VirtualTaskList
          tasks={tasks}
          users={users}
          currentUserId={currentUserId}
          onAccept={handleAccept}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </main>

      <Modal isOpen={showRegister} onClose={() => setShowRegister(false)} title="🎉 加入邻里互助社区">
        <RegisterForm
          onSubmit={handleRegister}
          onCancel={() => setShowRegister(false)}
          loading={formLoading}
          existingBuildings={existingBuildings}
        />
      </Modal>

      <Modal isOpen={showCreateTask} onClose={() => setShowCreateTask(false)} title="📝 发布互助任务">
        <CreateTaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateTask(false)}
          loading={formLoading}
        />
      </Modal>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '10px',
            background: toast.type === 'success' ? '#22c55e' : '#ef4444',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2000,
            animation: 'slideUp 0.3s ease'
          }}
        >
          {toast.msg}
        </div>
      )}

      <footer
        style={{
          padding: '30px 20px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '12px'
        }}
      >
        🏘️ 邻里互助 · 让社区更温暖
      </footer>
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [currentUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('neighbor_user_id');
    } catch {
      return null;
    }
  });
  const { users, loading: usersLoading, refreshUser } = useUsers();
  const { data: userTasks, completeTask, cancelTask, fetchTasks } = useTasks({ userId: id });

  const profileUser = users.find((u) => u.id === id) || null;
  const isCurrentUser = currentUserId === id;

  useEffect(() => {
    if (id) {
      refreshUser(id);
    }
  }, [id, refreshUser, userTasks.length]);

  const stats = useMemo(() => {
    const published = userTasks.filter((t) => t.publisherId === id);
    const accepted = userTasks.filter((t) => t.acceptorId === id);
    const completed = userTasks.filter((t) => t.status === 'completed');
    return {
      total: userTasks.length,
      published: published.length,
      accepted: accepted.length,
      completed: completed.length
    };
  }, [userTasks, id]);

  return (
    <div>
      <Header
        currentUser={users.find((u) => u.id === currentUserId) || null}
        onLoginClick={() => {}}
        onCreateTaskClick={() => {}}
        onLogout={() => {}}
      />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '20px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f97316')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
        >
          ← 返回首页
        </button>

        {usersLoading && !profileUser ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>加载中...</div>
        ) : profileUser ? (
          <>
            <div
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
                borderRadius: '16px',
                padding: '28px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                flexWrap: 'wrap',
                border: '1px solid #fed7aa',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: 'rgba(249,115,22,0.08)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-30px',
                  right: '80px',
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'rgba(245,158,11,0.1)'
                }}
              />

              <img
                src={profileUser.avatarUrl}
                alt={profileUser.nickname}
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  border: '4px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  objectFit: 'cover',
                  background: '#f3f4f6',
                  zIndex: 1
                }}
              />

              <div style={{ flex: 1, minWidth: '200px', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                    {profileUser.nickname}
                  </h1>
                  {isCurrentUser && (
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: '#f97316',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      这是我
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                  📍 {profileUser.building} · 加入于 {new Date(profileUser.createdAt).toLocaleDateString('zh-CN')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      boxShadow: '0 2px 8px rgba(249,115,22,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>⭐</span>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>信用积分</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#f97316', lineHeight: 1 }}>
                        {profileUser.creditScore}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '480px',
                  zIndex: 1
                }}
              >
                {[
                  { label: '总任务', value: stats.total, color: '#6366f1' },
                  { label: '我发布的', value: stats.published, color: '#8b5cf6' },
                  { label: '我接受的', value: stats.accepted, color: '#0ea5e9' },
                  { label: '已完成', value: stats.completed, color: '#22c55e' }
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      textAlign: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                📋 任务历史时间线
              </h2>
              <Timeline
                tasks={userTasks}
                users={users}
                currentUserId={currentUserId || undefined}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#9ca3af'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#6b7280' }}>用户不存在</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}
