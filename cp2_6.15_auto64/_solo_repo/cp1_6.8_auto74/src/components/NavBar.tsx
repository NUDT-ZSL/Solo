import { PenLine, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavBarProps {
  onWriteClick: () => void;
}

export default function NavBar({ onWriteClick }: NavBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isStats = location.pathname === '/stats';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-6 px-6 py-3"
      style={{
        background: 'rgba(255,248,240,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.5)',
      }}
    >
      <button
        onClick={onWriteClick}
        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #FF9AA2, #FFDAC1)',
          color: '#5A4A42',
          boxShadow: '0 4px 16px rgba(255,154,162,0.35)',
        }}
      >
        <PenLine size={16} />
        写日记
      </button>

      <button
        onClick={() => navigate(isStats ? '/' : '/stats')}
        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: isStats
            ? 'linear-gradient(135deg, #C7CEEA, #B8A9C9)'
            : 'rgba(255,255,255,0.5)',
          color: '#5A4A42',
          boxShadow: isStats
            ? '0 4px 16px rgba(199,206,234,0.35)'
            : '0 2px 8px rgba(0,0,0,0.06)',
          border: isStats ? 'none' : '1px solid rgba(255,255,255,0.4)',
        }}
      >
        <BarChart3 size={16} />
        统计
      </button>
    </nav>
  );
}
