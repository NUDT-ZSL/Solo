import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { Coach, Member, CourseType, Course, Notification, Booking } from './utils/api';
import { ws } from './utils/websocket';

const MemberDashboard = lazy(() => import('./pages/MemberDashboard'));
const CoachDashboard = lazy(() => import('./pages/CoachDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

type Role = 'none' | 'member' | 'coach' | 'admin';

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  currentMember: Member | null;
  setCurrentMember: (m: Member | null) => void;
  currentCoach: Coach | null;
  setCurrentCoach: (c: Coach | null) => void;
  courseTypes: CourseType[];
  coaches: Coach[];
  members: Member[];
  courses: Course[];
  refreshCourses: () => void;
  refreshAll: () => void;
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  myBookings: Booking[];
  refreshMyBookings: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RoleSelector({
  onSelect,
  coaches,
  members
}: {
  onSelect: (role: Role, member?: Member, coach?: Coach) => void;
  coaches: Coach[];
  members: Member[];
}) {
  const [selectedRole, setSelectedRole] = useState<Role>('none');
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const handleEnter = () => {
    if (selectedRole === 'admin') {
      onSelect('admin');
    } else if (selectedRole === 'coach' && selectedCoachId) {
      const coach = coaches.find((c) => c._id === selectedCoachId)!;
      onSelect('coach', undefined, coach);
    } else if (selectedRole === 'member' && selectedMemberId) {
      const member = members.find((m) => m._id === selectedMemberId)!;
      onSelect('member', member);
    }
  };

  const roleCards = [
    { role: 'member' as Role, icon: '🏋️', title: '会员端', desc: '浏览课程日历与预约', color: '#3b82f6' },
    { role: 'coach' as Role, icon: '👨‍🏫', title: '教练端', desc: '查看排班与课程签到', color: '#8b5cf6' },
    { role: 'admin' as Role, icon: '⚙️', title: '管理员端', desc: '课程管理与分配教练', color: '#1e3a5f' }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 50%, #3b82f6 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 48, color: 'white' }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>FitPro</h1>
        <p style={{ fontSize: 18, opacity: 0.9 }}>健身房会员预约与教练排班管理系统</p>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: 36,
          width: '100%',
          maxWidth: 720,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#1f2937' }}>请选择登录身份</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 24
          }}
        >
          {roleCards.map((card) => {
            const active = selectedRole === card.role;
            return (
              <div
                key={card.role}
                onClick={() => setSelectedRole(card.role)}
                style={{
                  padding: 24,
                  borderRadius: 16,
                  border: `2px solid ${active ? card.color : '#e5e7eb'}`,
                  background: active ? `${card.color}08` : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  transform: active ? 'translateY(-4px)' : 'none',
                  boxShadow: active ? `0 10px 25px -5px ${card.color}33` : 'none'
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1f2937', marginBottom: 4 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{card.desc}</div>
              </div>
            );
          })}
        </div>

        {selectedRole === 'coach' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
              选择教练
            </label>
            <select
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- 请选择 --</option>
              {coaches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRole === 'member' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
              选择会员
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- 请选择 --</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleEnter}
          disabled={
            selectedRole === 'none' ||
            (selectedRole === 'coach' && !selectedCoachId) ||
            (selectedRole === 'member' && !selectedMemberId)
          }
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            opacity:
              selectedRole === 'none' ||
              (selectedRole === 'coach' && !selectedCoachId) ||
              (selectedRole === 'member' && !selectedMemberId)
                ? 0.5
                : 1
          }}
        >
          进入系统
        </button>
      </div>
    </div>
  );
}

function NotificationBar({
  notifications,
  onDismiss,
  currentMember
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  currentMember: Member | null;
}) {
  const [closing, setClosing] = useState<Set<string>>(new Set());

  const handleClose = (id: string) => {
    setClosing((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  };

  if (!currentMember) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
      {notifications.map((n) => (
        <div
          key={n._id}
          className={closing.has(n._id) ? 'notification-slide-out' : 'notification-slide-in'}
          style={{
            width: '100%',
            minHeight: 60,
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            padding: '12px 24px',
            gap: 16,
            color: '#991b1b'
          }}
        >
          <div style={{ fontSize: 22 }}>🔔</div>
          <div style={{ flex: 1, fontSize: 14 }}>
            <strong>课程取消通知：</strong>
            <span>
              「{n.courseName}」原定于 {n.originalTime} 的课程已取消，原因：{n.reason}
            </span>
          </div>
          <button
            onClick={() => handleClose(n._id)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: '#dc2626',
              color: 'white',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            我知道了
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role>('none');
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  const loadBase = async () => {
    const [cts, cos, mbs] = await Promise.all([
      import('./utils/api').then((m) => m.api.getCourseTypes()),
      import('./utils/api').then((m) => m.api.getCoaches()),
      import('./utils/api').then((m) => m.api.getMembers())
    ]);
    setCourseTypes(cts);
    setCoaches(cos);
    setMembers(mbs);
  };

  const refreshCourses = async () => {
    const { api } = await import('./utils/api');
    const list = await api.getCourses();
    setCourses(list);
  };

  const refreshMyBookings = async () => {
    if (!currentMember) return;
    const { api } = await import('./utils/api');
    const list = await api.getBookings({ memberId: currentMember._id });
    setMyBookings(list.filter((b) => b.status === 'booked'));
  };

  const refreshNotifications = async () => {
    if (!currentMember) return;
    const { api } = await import('./utils/api');
    const list = await api.getNotifications(currentMember._id);
    setNotifications(list);
  };

  const refreshAll = async () => {
    await Promise.all([refreshCourses(), refreshMyBookings(), refreshNotifications()]);
  };

  useEffect(() => {
    loadBase();
    ws.connect('/ws');
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (role !== 'none') {
      refreshAll();
    }
  }, [role, currentMember, currentCoach]);

  useEffect(() => {
    const off1 = ws.on('booking:changed', (data: { courseId: string; bookedCount: number }) => {
      setCourses((prev) =>
        prev.map((c) => (c._id === data.courseId ? { ...c, bookedCount: data.bookedCount } : c))
      );
    });
    const off2 = ws.on('course:cancelled', (data: { id: string }) => {
      setCourses((prev) =>
        prev.map((c) => (c._id === data.id ? { ...c, status: 'cancelled' } : c))
      );
      if (currentMember) refreshNotifications();
    });
    const off3 = ws.on('course:created', () => {
      refreshCourses();
    });
    const off4 = ws.on('course:updated', () => {
      refreshCourses();
    });
    const off5 = ws.on('notification:new', (data: Notification) => {
      if (currentMember && data.memberIds.includes(currentMember._id)) {
        setNotifications((prev) => [data, ...prev]);
      }
    });
    return () => {
      off1();
      off2();
      off3();
      off4();
      off5();
    };
  }, [currentMember]);

  const dismissNotification = async (id: string) => {
    if (!currentMember) return;
    const { api } = await import('./utils/api');
    await api.markNotificationRead(id, currentMember._id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  const handleRoleSelect = (r: Role, member?: Member, coach?: Coach) => {
    setRole(r);
    if (member) setCurrentMember(member);
    if (coach) setCurrentCoach(coach);
  };

  const handleLogout = () => {
    setRole('none');
    setCurrentMember(null);
    setCurrentCoach(null);
    setNotifications([]);
    setMyBookings([]);
  };

  const state: AppState = {
    role,
    setRole,
    currentMember,
    setCurrentMember,
    currentCoach,
    setCurrentCoach,
    courseTypes,
    coaches,
    members,
    courses,
    refreshCourses,
    refreshAll,
    notifications,
    dismissNotification,
    myBookings,
    refreshMyBookings
  };

  const topPadding = notifications.length > 0 ? 60 * notifications.length + 8 : 8;

  return (
    <AppContext.Provider value={state}>
      <NotificationBar
        notifications={notifications}
        onDismiss={dismissNotification}
        currentMember={currentMember}
      />
      {role === 'none' ? (
        <RoleSelector onSelect={handleRoleSelect} coaches={coaches} members={members} />
      ) : (
        <div style={{ paddingTop: topPadding, minHeight: '100vh' }}>
          <div
            style={{
              background: '#1e3a5f',
              color: 'white',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: notifications.length > 0 ? 60 * notifications.length : 0,
              zIndex: 999
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>FitPro</div>
              <div style={{ fontSize: 12, opacity: 0.7, padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
                {role === 'admin' ? '管理员' : role === 'coach' ? `教练：${currentCoach?.name}` : `会员：${currentMember?.name}`}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              退出登录
            </button>
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            {role === 'member' && <MemberDashboard />}
            {role === 'coach' && <CoachDashboard />}
            {role === 'admin' && <AdminDashboard />}
          </Suspense>
        </div>
      )}
    </AppContext.Provider>
  );
}
