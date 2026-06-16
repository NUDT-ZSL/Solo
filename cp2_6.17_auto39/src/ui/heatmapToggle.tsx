import { Flame, FlameKindling } from 'lucide-react';
import { useGlobalStore } from '../store/useGlobalStore';

export function HeatmapToggle() {
  const showHeatmap = useGlobalStore(s => s.showHeatmap);
  const toggle = useGlobalStore(s => s.toggleHeatmap);

  return (
    <button
      aria-label={showHeatmap ? '隐藏热力图' : '显示热力图'}
      onClick={toggle}
      onTouchStart={e => { e.preventDefault(); toggle(); }}
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        minWidth: 44,
        minHeight: 44,
        borderRadius: 6,
        border: 'none',
        background: showHeatmap ? '#ffffff' : 'rgba(255,255,255,0.85)',
        color: '#333333',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit'
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = showHeatmap ? '#f0f0f0' : '#e0e0e0';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = showHeatmap ? '#ffffff' : 'rgba(255,255,255,0.85)';
      }}
    >
      {showHeatmap ? <Flame size={16} color="#ff6b6b" /> : <FlameKindling size={16} color="#888" />}
      <span>{showHeatmap ? '热力图 开' : '热力图 关'}</span>
    </button>
  );
}
