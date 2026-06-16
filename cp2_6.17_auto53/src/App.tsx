import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Course } from './types';
import MapPage from './pages/MapPage';
import UserPage from './pages/UserPage';

function NavBar({ courses, selectedCourseId, setSelectedCourseId, userRole, setUserRole }: {
  courses: Course[];
  selectedCourseId: string;
  setSelectedCourseId: (id: string) => void;
  userRole: 'teacher' | 'student';
  setUserRole: (role: 'teacher' | 'student') => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      background: '#fff',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      zIndex: 100
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#1a237e', whiteSpace: 'nowrap' }}>
        知识图谱复习系统
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <select
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 14,
            minWidth: 160
          }}
        >
          <option value="">选择课程</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => { setUserRole('teacher'); if (location.pathname !== '/') navigate('/'); }}
          style={{
            background: userRole === 'teacher' ? '#1a237e' : 'transparent',
            color: userRole === 'teacher' ? '#fff' : '#1a237e',
            border: '1px solid #1a237e',
            borderRadius: 4,
            padding: '4px 16px',
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          教师
        </button>
        <button
          onClick={() => { setUserRole('student'); if (location.pathname !== '/') navigate('/'); }}
          style={{
            background: userRole === 'student' ? '#1a237e' : 'transparent',
            color: userRole === 'student' ? '#fff' : '#1a237e',
            border: '1px solid #1a237e',
            borderRadius: 4,
            padding: '4px 16px',
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          学生
        </button>
        <button
          onClick={() => navigate('/users')}
          style={{
            background: location.pathname === '/users' ? '#1a237e' : 'transparent',
            color: location.pathname === '/users' ? '#fff' : '#1a237e',
            border: '1px solid #1a237e',
            borderRadius: 4,
            padding: '4px 16px',
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          用户管理
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [userRole, setUserRole] = useState<'teacher' | 'student'>('student');

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then((data: Course[]) => {
        setCourses(data);
        if (data.length > 0) setSelectedCourseId(data[0].id);
      })
      .catch(console.error);
  }, []);

  const userId = userRole === 'teacher' ? 'user-1' : 'user-2';

  return (
    <BrowserRouter>
      <NavBar
        courses={courses}
        selectedCourseId={selectedCourseId}
        setSelectedCourseId={setSelectedCourseId}
        userRole={userRole}
        setUserRole={setUserRole}
      />
      <div style={{ paddingTop: 56 }}>
        <Routes>
          <Route path="/" element={<MapPage courseId={selectedCourseId} userRole={userRole} userId={userId} />} />
          <Route path="/users" element={<UserPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
