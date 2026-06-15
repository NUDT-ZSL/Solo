import { Routes, Route, Link } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

const VotePage = lazy(() => import('./pages/VotePage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          borderBottom: '2px solid #e94560',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            style={{ fontSize: '32px' }}
          >
            🎵
          </motion.div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e0e0e0' }}>
            音乐演出曲目投票
          </h1>
        </div>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <NavLink to="/">投票</NavLink>
          <NavLink to="/results">排程结果</NavLink>
        </nav>
      </motion.header>

      <main style={{ flex: 1, padding: '24px' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: '40px', height: '40px', border: '4px solid #0f3460', borderTopColor: '#e94560', borderRadius: '50%' }}
            />
          </div>
        }>
          <Routes>
            <Route path="/" element={<VotePage />} />
            <Route path="/results" element={<ResultPage />} />
          </Routes>
        </Suspense>
      </main>

      <footer style={{
        background: '#16213e',
        padding: '16px',
        textAlign: 'center',
        color: '#888',
        fontSize: '14px',
        borderTop: '1px solid #0f3460',
      }}>
        🎸 音乐爱好者社团 · 曲目投票系统
      </footer>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        padding: '8px 20px',
        borderRadius: '8px',
        textDecoration: 'none',
        color: '#e0e0e0',
        fontWeight: 500,
        transition: 'all 0.3s ease',
        background: 'transparent',
        border: '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#0f3460';
        e.currentTarget.style.borderColor = '#e94560';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
    >
      {children}
    </Link>
  );
}

export default App;
