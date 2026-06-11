import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useEffect } from 'react';
import Home from '@/pages/Home';
import PollDetail from '@/pages/PollDetail';
import Favorites from '@/pages/Favorites';

function Navbar() {
  const { nickname, setNickname } = useStore();

  return (
    <nav className="bg-gradient-to-r from-[#1a237e] to-[#283593] text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg tracking-wide hover:opacity-90 transition-opacity">
          实时投票平台
        </Link>

        <div className="flex items-center gap-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入昵称"
            maxLength={20}
            className="bg-white/15 border border-white/20 rounded-lg px-3 py-1.5 text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 w-32 transition-all"
          />
          <Link
            to="/favorites"
            className="btn-interactive relative hover:opacity-90 transition-opacity"
            aria-label="收藏"
          >
            <Heart className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { initSocket } = useStore();

  useEffect(() => {
    initSocket();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#f9f9f9]">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/poll/:id" element={<PollDetail />} />
          <Route path="/favorites" element={<Favorites />} />
        </Routes>
      </div>
    </Router>
  );
}
