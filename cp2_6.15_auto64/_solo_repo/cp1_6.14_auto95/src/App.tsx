import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Detail from './pages/Detail'
import Create from './pages/Create'

function App() {
  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <Link to="/" style={styles.logo}>
            <span style={styles.logoIcon}>🍳</span>
            <span style={styles.logoText}>RecipeNest</span>
          </Link>
          <div style={styles.navLinks}>
            <Link to="/" style={styles.navLink}>首页</Link>
            <Link to="/create" style={styles.createBtn}>
              <span style={{ marginRight: 6 }}>+</span>创建菜谱
            </Link>
          </div>
        </div>
      </nav>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipe/:id" element={<Detail />} />
          <Route path="/create" element={<Create />} />
        </Routes>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#faf7f2',
  },
  nav: {
    position: 'sticky' as React.CSSProperties['position'],
    top: 0,
    zIndex: 100,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e8e2d9',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  navInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontSize: 28,
  },
  logoText: {
    fontFamily: 'Georgia, serif',
    fontSize: 24,
    fontWeight: 700,
    color: '#2d2a24',
    letterSpacing: 0.5,
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  navLink: {
    fontSize: 15,
    color: '#8d7b68',
    transition: 'color 0.2s ease',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    height: 40,
    padding: '0 20px',
    backgroundColor: '#d4a373',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 20,
    transition: 'all 0.2s ease',
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 24px',
  },
}

export default App
