import { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';

interface ControlBarProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onProgressChange: (page: number) => void;
  theme: 'dark' | 'parchment';
  onThemeToggle: () => void;
  onBack: () => void;
}

export default function ControlBar({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onProgressChange,
  theme,
  onThemeToggle,
  onBack,
}: ControlBarProps) {
  const progress = totalPages > 1 ? currentPage / (totalPages - 1) : 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    },
    [onPrev, onNext]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        const newPage = Math.max(0, Math.min(totalPages - 1, currentPage + delta));
        onProgressChange(newPage);
      }
    },
    [currentPage, totalPages, onProgressChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel as EventListener);
    };
  }, [handleKeyDown, handleWheel]);

  const glassBg = theme === 'dark'
    ? 'rgba(20, 20, 40, 0.65)'
    : 'rgba(210, 190, 150, 0.65)';
  const glassBorder = theme === 'dark'
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(100, 70, 30, 0.12)';
  const iconColor = theme === 'dark' ? '#b0b0cc' : '#6b5030';
  const textColor = theme === 'dark' ? 'rgba(200, 200, 220, 0.6)' : 'rgba(80, 60, 30, 0.6)';

  return (
    <div
      className="control-bar"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 24px',
        borderRadius: 20,
        background: glassBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${glassBorder}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        zIndex: 100,
        transition: 'background 0.6s ease, border-color 0.6s ease',
      }}
    >
      <button
        onClick={onBack}
        title="返回书库"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          transition: 'color 0.3s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>

      <div style={{ width: 1, height: 20, background: glassBorder }} />

      <button
        onClick={onPrev}
        disabled={currentPage <= 0}
        title="上一页 (←)"
        style={{
          background: 'none',
          border: 'none',
          cursor: currentPage <= 0 ? 'not-allowed' : 'pointer',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentPage <= 0 ? (theme === 'dark' ? 'rgba(100,100,130,0.3)' : 'rgba(140,110,70,0.3)') : iconColor,
          transition: 'color 0.3s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (currentPage > 0) e.currentTarget.style.transform = 'scale(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <ChevronLeft size={20} />
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 120 }}>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalPages - 1)}
          value={currentPage}
          onChange={(e) => onProgressChange(Number(e.target.value))}
          style={{
            width: 120,
            height: 4,
            accentColor: theme === 'dark' ? '#6b7fdb' : '#b08930',
            cursor: 'pointer',
            borderRadius: 2,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontFamily: '"ZCOOL XiaoWei", serif',
            color: textColor,
            letterSpacing: 1,
            transition: 'color 0.6s ease',
          }}
        >
          {currentPage + 1} / {totalPages}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        title="下一页 (→)"
        style={{
          background: 'none',
          border: 'none',
          cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentPage >= totalPages - 1 ? (theme === 'dark' ? 'rgba(100,100,130,0.3)' : 'rgba(140,110,70,0.3)') : iconColor,
          transition: 'color 0.3s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (currentPage < totalPages - 1) e.currentTarget.style.transform = 'scale(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <ChevronRight size={20} />
      </button>

      <div style={{ width: 1, height: 20, background: glassBorder }} />

      <button
        onClick={onThemeToggle}
        title={theme === 'dark' ? '切换至羊皮纸' : '切换至暗色'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          transition: 'color 0.3s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15) rotate(15deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
