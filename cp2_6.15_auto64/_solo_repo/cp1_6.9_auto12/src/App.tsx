import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ListPage from './pages/ListPage';
import CreatePage from './pages/CreatePage';
import DetailPage from './pages/DetailPage';

function App() {
  const location = useLocation();
  const showCreateBtn = location.pathname !== '/create';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar">
        <div className="container">
          <div className="navbar-inner">
            <Link to="/" className="navbar-logo">
              ⏳ 时间胶囊
            </Link>
            {showCreateBtn && (
              <Link to="/create" className="btn-create">
                + 创建胶囊
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <div className="container page-content">
          <Routes>
            <Route path="/" element={<ListPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/capsule/:id" element={<DetailPage />} />
          </Routes>
        </div>
      </main>

      <footer style={{ 
        padding: '24px 0', 
        textAlign: 'center', 
        color: '#64748B', 
        fontSize: '0.85rem',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div className="container">
          © {new Date().getFullYear()} 时间胶囊 · 封存此刻，遇见未来
        </div>
      </footer>
    </div>
  );
}

export default App;
