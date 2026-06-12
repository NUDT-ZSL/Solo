import { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Upload, Search } from 'lucide-react';
import { FilterContext } from '@/App';
import UploadModal from './UploadModal';

export default function Navbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const { keyword, setKeyword } = useContext(FilterContext);

  const navLinks = [
    { path: '/', label: '素材库' },
    { path: '/board', label: '看板' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-nav z-40 shadow-lg">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="text-white text-xl font-bold font-display">
              灵感看板
            </Link>

            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'text-brand bg-white/10'
                      : 'text-white hover:text-brand hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {location.pathname === '/' && (
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索素材..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-colors"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">上传</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-gray-400 overflow-hidden">
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E"
                alt="用户头像"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </nav>

      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
