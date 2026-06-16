import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MapPage from './pages/MapPage';
import MyPlantsPage from './pages/MyPlantsPage';
import PlantDetailPage from './pages/PlantDetailPage';

function App() {
  const location = useLocation();

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <h1 className="nav-title">🌱 绿植领养</h1>
          <div className="nav-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              地图
            </Link>
            <Link to="/mine" className={`nav-link ${location.pathname === '/mine' ? 'active' : ''}`}>
              我的绿植
            </Link>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/mine" element={<MyPlantsPage />} />
          <Route path="/plant/:id" element={<PlantDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
