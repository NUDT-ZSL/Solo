import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MovieList from './components/MovieList'
import MovieDetail from './components/MovieDetail'
import RankList from './components/RankList'

export default function App() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={styles.app}>
      <style>{globalStyles}</style>
      <nav style={{
        ...styles.nav,
        ...(scrolled ? styles.navScrolled : {})
      }}>
        <div style={styles.navContent}>
          <Link to="/" style={styles.logo} className="logo">
            <span style={styles.logoIcon}>🎬</span>
            <span style={styles.logoText}>MovieVote</span>
          </Link>
          <div style={styles.navLinks}>
            <Link
              to="/"
              style={{
                ...styles.navLink,
                ...(location.pathname === '/' ? styles.navLinkActive : {})
              }}
              className="nav-link"
            >
              电影列表
            </Link>
            <Link
              to="/ranking"
              style={{
                ...styles.navLink,
                ...(location.pathname === '/ranking' ? styles.navLinkActive : {})
              }}
              className="nav-link"
            >
              排行榜
            </Link>
          </div>
        </div>
      </nav>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<MovieList />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/ranking" element={<RankList />} />
        </Routes>
      </main>
    </div>
  )
}

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  body {
    overflow-x: hidden;
  }
  a {
    text-decoration: none;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    border-radius: 4px;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFD700, #FFA500);
    cursor: pointer;
    border: 3px solid #1a1a2e;
    box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
    transition: transform 0.2s ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
  input[type="range"]::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFD700, #FFA500);
    cursor: pointer;
    border: 3px solid #1a1a2e;
    box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
  }
  select {
    font-family: inherit;
  }
  select option {
    background-color: #1a1a3e;
    color: #e8e8f0;
  }
  img {
    user-drag: none;
    -webkit-user-drag: none;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%, 100% { background-position: -200% 0; }
    50% { background-position: 200% 0; }
  }
  @keyframes rankFlash {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(255, 215, 0, 0.25); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 10px #7CFC00; }
    50% { opacity: 0.6; box-shadow: 0 0 20px #7CFC00, 0 0 40px rgba(124, 252, 0, 0.3); }
  }
  @keyframes cardFloat {
    0% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-3px) scale(1.01); }
    100% { transform: translateY(0) scale(1); }
  }

  .movie-card:hover {
    transform: translateY(-8px) scale(1.02) !important;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.15) !important;
    border-color: rgba(255, 215, 0, 0.35) !important;
  }
  .movie-card:hover .movie-poster {
    transform: scale(1.1) !important;
  }
  .movie-card:hover .poster-overlay {
    background: linear-gradient(to top, rgba(10, 10, 31, 0.85) 0%, transparent 60%) !important;
  }

  .nav-link:hover {
    color: #FFD700 !important;
    background: rgba(255, 215, 0, 0.08) !important;
  }

  .reset-btn:hover {
    background: rgba(255, 215, 0, 0.15) !important;
    transform: translateY(-1px);
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02) !important;
    box-shadow: 0 12px 40px rgba(255, 165, 0, 0.5) !important;
    background-position: 100% 50% !important;
  }

  .filter-select:hover, .filter-select:focus {
    border-color: rgba(255, 215, 0, 0.5) !important;
    background: rgba(255, 255, 255, 0.08) !important;
  }

  .back-link:hover {
    opacity: 1 !important;
    transform: translateX(-4px);
  }

  .rank-row:hover {
    background: rgba(255, 215, 0, 0.06) !important;
    transform: translateX(4px);
  }

  .logo:hover {
    filter: brightness(1.1);
  }

  @media (max-width: 768px) {
    nav { padding: 12px 16px !important; }
    main { padding: 84px 16px 40px !important; }
    .filter-bar { padding: 16px !important; gap: 12px !important; }
    .filter-group { flex: 1 1 45% !important; }
    .filter-select { min-width: auto !important; width: 100% !important; }
    .result-count { margin-left: 0 !important; width: 100%; text-align: right; padding-bottom: 0 !important; }
    .grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
    .header-section { flex-direction: column !important; padding: 20px !important; gap: 20px !important; }
    .large-poster { width: 100% !important; }
    .title { font-size: 26px !important; }
    .stats-card { flex-direction: column !important; gap: 20px !important; padding: 20px !important; }
    .stat-divider { width: 100% !important; height: 1px !important; }
    .detail-section { padding: 20px !important; }
    .header { flex-direction: column !important; }
    .rank-header { padding: 12px 16px !important; font-size: 11px !important; }
    .rank-header > div:nth-child(4), .rank-header > div:nth-child(5) { display: none !important; }
    .rank-row { padding: 12px 16px !important; }
    .rank-row > div:nth-child(4), .rank-row > div:nth-child(5) { display: none !important; }
    .movie-title { font-size: 14px !important; }
    .cast-grid { gap: 10px !important; }
    .cast-card { padding: 12px 14px !important; min-width: 80px !important; }
    .cast-avatar { width: 42px !important; height: 42px !important; font-size: 18px !important; }
    .score-preview { padding: 16px 24px !important; }
    .slider-track-wrap { max-width: 100% !important; }
    .submit-btn { padding: 14px 36px !important; }
    .nav-links { gap: 4px !important; }
    .nav-link { padding: 8px 14px !important; font-size: 13px !important; }
    .logo-text { font-size: 20px !important; }
    .logo-icon { font-size: 26px !important; }
  }

  @media (max-width: 480px) {
    .grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
    .card-info { padding: 10px !important; }
    .card-title { font-size: 13px !important; }
    .card-meta { font-size: 11px !important; }
    .thumbnail { display: none !important; }
    .rank-badge { width: 32px !important; height: 32px !important; font-size: 13px !important; }
    .countdown-value { font-size: 18px !important; }
    .status-card { padding: 10px 16px !important; gap: 12px !important; }
  }
`

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a1f 0%, #1a1a3e 50%, #0f0f2e 100%)',
    color: '#e8e8f0'
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: '16px 32px',
    background: 'transparent',
    transition: 'all 0.4s ease',
    borderBottom: '1px solid transparent'
  },
  navScrolled: {
    background: 'rgba(10, 10, 31, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 215, 0, 0.15)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
  },
  navContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoIcon: {
    fontSize: '32px'
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF8C00)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '1px'
  },
  navLinks: {
    display: 'flex',
    gap: '8px'
  },
  navLink: {
    padding: '10px 24px',
    color: '#b0b0c8',
    fontWeight: 500,
    fontSize: '15px',
    borderRadius: '10px',
    transition: 'all 0.3s ease'
  },
  navLinkActive: {
    color: '#FFD700',
    background: 'rgba(255, 215, 0, 0.12)',
    boxShadow: 'inset 0 0 0 1px rgba(255, 215, 0, 0.3)'
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '100px 32px 60px'
  }
}
