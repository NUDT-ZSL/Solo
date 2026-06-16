import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import ItemListPage from './pages/ItemListPage';
import ItemDetailPage from './pages/ItemDetailPage';
import ProfilePage from './pages/ProfilePage';
import HeatmapPage from './pages/HeatmapPage';
import { useCurrentUser } from './hooks/useUser';

function App() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">♻</div>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title="物品广场"
          >
            🏠
          </NavLink>
          <NavLink
            to="/heatmap"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title="附近热力图"
          >
            🗺
          </NavLink>
          <button
            className={`sidebar-link ${
              location.pathname.startsWith('/profile') ? 'active' : ''
            }`}
            onClick={() => navigate('/profile')}
            title="个人中心"
          >
            👤
          </button>
        </nav>
        <div className="sidebar-user" onClick={() => navigate('/profile')}>
          {user?.avatar && (
            <img src={user.avatar} alt={user.username} />
          )}
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ItemListPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
