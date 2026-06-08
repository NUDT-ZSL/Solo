import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import HomePage from '@/pages/HomePage';
import UserPage from '@/pages/UserPage';
import HotPoems from '@/pages/HotPoems';

function NavBar() {
  const { searchQuery, setSearchQuery, searchPoems } = useStore();
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      searchPoems(searchQuery.trim());
      navigate('/');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-night-900/70 border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="gold-text text-xl font-bold tracking-wider">
          言灵诗歌
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-night-100 hover:text-gold-400 transition-colors text-sm">
            首页
          </Link>
          <Link to="/hot" className="text-night-100 hover:text-gold-400 transition-colors text-sm">
            热诗榜
          </Link>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-100" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="搜索诗句..."
              className="w-44 pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-night-50 text-sm placeholder:text-night-100/50 focus:outline-none focus:border-gold-400/50 transition-colors"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main className="pt-14 min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/user/:anonymousId" element={<UserPage />} />
          <Route path="/hot" element={<HotPoems />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
