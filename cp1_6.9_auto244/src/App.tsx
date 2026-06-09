import { Routes, Route, Link } from 'react-router-dom';
import Gallery from './pages/Gallery';
import Upload from './pages/Upload';
import Detail from './pages/Detail';

function App() {
  return (
    <div className="app">
      <header className="header glass-card">
        <div className="header-inner">
          <Link to="/" className="logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">流光画廊</span>
          </Link>
          <nav className="nav">
            <Link to="/" className="nav-link">画廊</Link>
            <Link to="/upload" className="nav-link upload-btn">
              <span className="upload-icon">＋</span>
              上传作品
            </Link>
          </nav>
        </div>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>© 2026 流光画廊 · 探索创意的无限可能</p>
      </footer>
    </div>
  );
}

export default App;
