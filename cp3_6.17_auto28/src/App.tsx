import { useEffect, useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';
import type { User } from './types';
import Navbar from './components/Navbar';
import Overview from './pages/Overview';
import DeviceDetail from './pages/DeviceDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { getUserById } from './api/borrowApi';

const USERS: User[] = [
  { id: 'user-001', name: '张明', avatar: '', creditScore: 98 },
  { id: 'user-002', name: '李华', avatar: '', creditScore: 75 },
  { id: 'user-003', name: '王芳', avatar: '', creditScore: 100 }
];

function Shell() {
  const [currentUserId, setCurrentUserId] = useState('user-001');
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]);
  const [navKey, setNavKey] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getUserById(currentUserId)
      .then(data => {
        if (!cancelled) {
          setCurrentUser({
            id: data.id,
            name: data.name,
            avatar: data.avatar,
            creditScore: data.creditScore
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = USERS.find(u => u.id === currentUserId) || USERS[0];
          setCurrentUser(fallback);
        }
      });
    return () => { cancelled = true; };
  }, [currentUserId, navKey]);

  const handleSelectUser = (id: string) => {
    setCurrentUserId(id);
    setNavKey(k => k + 1);
    if (location.pathname.startsWith('/profile')) {
      navigate('/profile', { replace: true });
    }
  };

  const handleRefreshUser = () => setNavKey(k => k + 1);

  return (
    <div
      className="min-h-screen"
      style={{ background: '#f8fafc' }}
    >
      <Navbar
        currentUserId={currentUserId}
        onSelectUser={handleSelectUser}
        userName={currentUser.name}
      />

      <main
        className="pt-[60px] px-4 sm:px-6 lg:px-10 py-8 transition-all duration-300"
      >
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/overview" replace />}
          />
          <Route
            path="/overview"
            element={
              <Overview
                key={`overview-${navKey}`}
                userId={currentUser.id}
                userCreditScore={currentUser.creditScore}
                userName={currentUser.name}
              />
            }
          />
          <Route
            path="/device/:id"
            element={
              <DeviceDetail
                key={`detail-${navKey}`}
                userId={currentUser.id}
                userCreditScore={currentUser.creditScore}
              />
            }
          />
          <Route
            path="/profile"
            element={<Profile key={`profile-${navKey}`} userId={currentUser.id} />}
          />
          <Route
            path="/admin"
            element={<Admin key={`admin-${navKey}`} />}
          />
          <Route
            path="*"
            element={<Navigate to="/overview" replace />}
          />
        </Routes>
      </main>

      {currentUser.creditScore < 60 && (
        <UserScoreWarningHandler onRefresh={handleRefreshUser} />
      )}
    </div>
  );
}

function UserScoreWarningHandler({ onRefresh }: { onRefresh: () => void }) {
  useEffect(() => {
    const t = setTimeout(onRefresh, 10000);
    return () => clearTimeout(t);
  }, [onRefresh]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
