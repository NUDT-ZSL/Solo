import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BeerDetail from './pages/BeerDetail';
import Profile from './pages/Profile';

export default function App() {
  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoIcon}>🍺</span>
          <span style={styles.logoText}>BrewGuide</span>
        </Link>
        <div style={styles.navLinks}>
          <Link to="/" style={styles.navLink} className="nav-link">首页</Link>
          <Link to="/profile" style={styles.navLink} className="nav-link">个人中心</Link>
        </div>
      </nav>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/beer/:id" element={<BeerDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#0a0a1a',
    color: '#ffffff'
  },
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    background: 'rgba(10, 10, 26, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(245, 158, 11, 0.2)'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    color: '#ffffff'
  },
  logoIcon: {
    fontSize: '28px'
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  navLinks: {
    display: 'flex',
    gap: '24px'
  },
  navLink: {
    color: '#a0a0b0',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'color 0.2s ease',
    cursor: 'pointer'
  },
  main: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto'
  }
};
