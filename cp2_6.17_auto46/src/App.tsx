import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PlantDetail from './pages/PlantDetail';
import ExchangePage from './pages/ExchangePage';
import './App.css';

function NavBar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon">🌿</span>
          <span className="navbar__logo-text">绿意</span>
        </Link>

        <div className="navbar__links">
          <Link
            to="/"
            className={`navbar__link ${location.pathname === '/' ? 'navbar__link--active' : ''}`}
          >
            首页
          </Link>
          <Link
            to="/exchange"
            className={`navbar__link ${location.pathname.startsWith('/exchange') ? 'navbar__link--active' : ''}`}
          >
            交换广场
          </Link>
        </div>

        <div className="navbar__user">
          <div className="user-avatar">
            <span>🌱</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <NavBar />
        <main className="app__main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plant/:id" element={<PlantDetail />} />
            <Route path="/exchange" element={<ExchangePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
