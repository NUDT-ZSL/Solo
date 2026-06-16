import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen, User, Home } from 'lucide-react';
import HomePage from './pages/HomePage';
import BookDetailPage from './pages/BookDetailPage';
import ProfilePage from './pages/ProfilePage';
import './styles/index.css';

function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <BookOpen size={28} />
        <span>二手书漂流</span>
      </Link>
      <div className="nav-links">
        <Link
          to="/"
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          <Home size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          首页
        </Link>
        <Link
          to="/profile"
          className={`nav-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
        >
          <User size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          个人中心
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
