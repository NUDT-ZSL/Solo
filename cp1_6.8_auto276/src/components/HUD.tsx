import React from 'react';

interface HUDProps {
  level: number;
  activated: number;
  total: number;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
    color: '#e0e8ff',
    zIndex: 10,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  levelBadge: {
    background: 'rgba(30, 20, 80, 0.5)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(120, 100, 255, 0.3)',
    borderRadius: 20,
    padding: '8px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  levelText: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 1,
    textShadow: '0 0 12px rgba(130, 100, 255, 0.6)',
  },
  nodeText: {
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: 0.5,
    textShadow: '0 0 10px rgba(100, 220, 180, 0.5)',
  },
  nodeHighlight: {
    color: '#7fffb0',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  button: {
    pointerEvents: 'auto',
    background: 'rgba(30, 20, 80, 0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(120, 100, 255, 0.25)',
    borderRadius: 12,
    padding: '10px 28px',
    color: '#c8d0ff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(5, 5, 30, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    animation: 'fadeIn 0.3s ease',
  },
  menuBox: {
    background: 'rgba(20, 15, 60, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(120, 100, 255, 0.3)',
    borderRadius: 24,
    padding: '40px 50px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    pointerEvents: 'auto',
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
    textShadow: '0 0 20px rgba(130, 100, 255, 0.7)',
    marginBottom: 8,
  },
  menuButton: {
    pointerEvents: 'auto',
    background: 'rgba(60, 40, 140, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(130, 100, 255, 0.35)',
    borderRadius: 14,
    padding: '12px 48px',
    color: '#d0d8ff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: 1,
    minWidth: 160,
    textAlign: 'center' as const,
  },
};

export default function HUD({ level, activated, total, paused, onPause, onResume, onReset }: HUDProps) {
  const [hoveredBtn, setHoveredBtn] = React.useState<string | null>(null);

  const btnStyle = (id: string): React.CSSProperties => ({
    ...styles.button,
    ...(hoveredBtn === id ? {
      background: 'rgba(60, 40, 140, 0.5)',
      borderColor: 'rgba(150, 120, 255, 0.5)',
      transform: 'scale(1.05)',
    } : {}),
  });

  const menuBtnStyle = (id: string): React.CSSProperties => ({
    ...styles.menuButton,
    ...(hoveredBtn === id ? {
      background: 'rgba(80, 50, 180, 0.5)',
      borderColor: 'rgba(170, 140, 255, 0.5)',
      transform: 'scale(1.05)',
    } : {}),
  });

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={styles.topBar}>
        <div style={styles.levelBadge}>
          <span style={styles.levelText}>关卡 {level}</span>
          <span style={{ color: 'rgba(120, 100, 255, 0.4)' }}>|</span>
          <span style={styles.nodeText}>
            节点 <span style={styles.nodeHighlight}>{activated}</span> / {total}
          </span>
        </div>
      </div>

      <div style={styles.bottomBar}>
        <button
          style={btnStyle('reset')}
          onMouseEnter={() => setHoveredBtn('reset')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={onReset}
        >
          ↻ 重置
        </button>
        <button
          style={btnStyle('pause')}
          onMouseEnter={() => setHoveredBtn('pause')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={onPause}
        >
          ❚❚ 暂停
        </button>
      </div>

      {paused && (
        <div style={styles.overlay}>
          <div style={styles.menuBox}>
            <div style={styles.menuTitle}>⏸ 暂停</div>
            <button
              style={menuBtnStyle('continue')}
              onMouseEnter={() => setHoveredBtn('continue')}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={onResume}
            >
              ▶ 继续
            </button>
            <button
              style={menuBtnStyle('replay')}
              onMouseEnter={() => setHoveredBtn('replay')}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={onReset}
            >
              ↻ 重玩
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
