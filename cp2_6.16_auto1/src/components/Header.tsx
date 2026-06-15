import { useState } from 'react';
import { Menu, X, BookOpen } from 'lucide-react';

interface HeaderProps {
  onNavigate: (page: 'home' | 'entry' | 'stats') => void;
  currentPage: 'home' | 'entry' | 'stats';
}

export default function Header({ onNavigate, currentPage }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'home' as const, label: '首页' },
    { id: 'entry' as const, label: '录入' },
    { id: 'stats' as const, label: '统计' },
  ];

  const handleNavClick = (page: 'home' | 'entry' | 'stats') => {
    onNavigate(page);
    setMenuOpen(false);
  };

  return (
    <header className="h-[60px] w-full relative z-50">
      <div
        className="h-full w-full px-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #ffcc80 0%, #ffb74d 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={24} color="#5d4037" />
          <h1
            className="text-[18px] font-bold"
            style={{ color: '#5d4037' }}
          >
            亲子阅读日记
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="px-3 py-2 rounded-lg transition-all duration-200 font-medium"
              style={{
                color: currentPage === item.id ? '#fff' : '#5d4037',
                backgroundColor: currentPage === item.id ? '#ff9800' : 'transparent',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          {menuOpen ? <X size={24} color="#5d4037" /> : <Menu size={24} color="#5d4037" />}
        </button>
      </div>

      {menuOpen && (
        <div
          className="md:hidden absolute top-[60px] left-0 right-0 bg-white shadow-lg z-50"
          style={{ animation: 'slide-down 0.3s ease-out' }}
        >
          <nav className="flex flex-col">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="px-6 py-4 text-left border-b border-gray-100 transition-colors hover:bg-orange-50"
                style={{
                  color: currentPage === item.id ? '#ff9800' : '#5d4037',
                  fontWeight: currentPage === item.id ? 700 : 500,
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
