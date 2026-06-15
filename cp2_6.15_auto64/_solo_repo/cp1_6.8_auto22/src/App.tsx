import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LayoutGrid } from 'lucide-react';
import WallPage from '@/pages/WallPage';
import SparkPage from '@/pages/SparkPage';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-card rounded-full px-2 py-1.5 flex items-center gap-1">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all duration-300 ${
            location.pathname === '/'
              ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-purple/30'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <LayoutGrid size={14} />
          <span>灵感墙</span>
        </button>
        <button
          onClick={() => navigate('/sparks')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all duration-300 ${
            location.pathname === '/sparks'
              ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-purple/30'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <Sparkles size={14} />
          <span>火花集</span>
        </button>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<WallPage />} />
          <Route path="/sparks" element={<SparkPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <div className="w-full h-full bg-wall-bg overflow-hidden">
        <AnimatedRoutes />
        <Navigation />
      </div>
    </Router>
  );
}
