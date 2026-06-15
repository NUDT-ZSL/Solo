import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Link,
} from 'react-router-dom';
import { GraduationCap, UserRound, BookOpen } from 'lucide-react';
import { ToastContainer } from './components/ToastContainer';
import { TeacherPanel } from './components/TeacherPanel';
import { StudentQuiz } from './components/StudentQuiz';
import { useToast } from './hooks/useToast';

function NavBar() {
  const location = useLocation();
  const [role, setRole] = useState<'teacher' | 'student'>(
    location.pathname.startsWith('/teacher') ? 'teacher' : 'student'
  );

  useEffect(() => {
    if (location.pathname.startsWith('/teacher')) setRole('teacher');
    else setRole('student');
  }, [location.pathname]);

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        backgroundColor: '#0f1622',
        borderBottom: '1px solid #2a3749',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BookOpen size={24} color="#f97316" />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 0.5,
          }}
        >
          智能题库系统
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 4,
          backgroundColor: '#2d3b4e',
          borderRadius: 10,
        }}
      >
        <Link
          to="/teacher"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: role === 'teacher' ? '#fff' : '#9ca3af',
            backgroundColor: role === 'teacher' ? '#f97316' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <GraduationCap size={16} />
          教师端
        </Link>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: role === 'student' ? '#fff' : '#9ca3af',
            backgroundColor: role === 'student' ? '#f97316' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <UserRound size={16} />
          学生端
        </Link>
      </div>
    </nav>
  );
}

function HomePage({
  showToast,
}: {
  showToast: ReturnType<typeof useToast>['showToast'];
}) {
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('error', '请输入您的姓名');
      return;
    }
    navigate(`/student?name=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background:
          'radial-gradient(ellipse at top left, rgba(249,115,22,0.15), transparent 50%), radial-gradient(ellipse at bottom right, rgba(37,99,235,0.12), transparent 50%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 40,
          backgroundColor: 'rgba(45, 59, 78, 0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.4s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <UserRound size={48} color="#f97316" style={{ margin: '0 auto 14px' }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
            学生登录
          </h1>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>
            输入姓名后开始随机抽题测验
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 8,
              color: '#d1d5db',
            }}
          >
            姓名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="请输入您的姓名"
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: '#1a2332',
              border: '1px solid #3b4b62',
              borderRadius: 10,
              color: '#fff',
              fontSize: 15,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '13px 20px',
            backgroundColor: '#f97316',
            color: '#fff',
            fontWeight: 600,
            borderRadius: 10,
            fontSize: 15,
            transition: 'transform 0.15s, background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ea580c';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f97316';
          }}
        >
          开始答题
        </button>

        <div
          style={{
            marginTop: 24,
            padding: 14,
            backgroundColor: 'rgba(249,115,22,0.08)',
            borderRadius: 10,
            fontSize: 13,
            color: '#d1d5db',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: '#f97316' }}>测验规则：</strong>
          <br />
          · 随机抽取 5 道选择题
          <br />· 每题限时 30 秒
          <br />· 超时自动标记为未作答
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const { toasts, showToast } = useToast();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <ToastContainer toasts={toasts} />
      <Routes>
        <Route path="/" element={<HomePage showToast={showToast} />} />
        <Route path="/teacher" element={<TeacherPanel showToast={showToast} />} />
        <Route path="/student" element={<StudentQuiz showToast={showToast} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
