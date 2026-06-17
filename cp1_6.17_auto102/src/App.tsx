import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import ActivityListPage from './pages/ActivityListPage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import CreateActivityPage from './pages/CreateActivityPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';

const App = () => {
  return (
    <HashRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavBar />
        <main style={{ flex: 1 }}>
          <div className="container page">
            <Routes>
              <Route path="/" element={<ActivityListPage />} />
              <Route path="/activity/:id" element={<ActivityDetailPage />} />
              <Route path="/create" element={<CreateActivityPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <footer style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: '#9E9E9E', borderTop: '1px solid #EEEEEE' }}>
          © 2026 社区读书会 · 让阅读遇见同好
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;
