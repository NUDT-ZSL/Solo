import React from 'react';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Square,
  Circle,
  Menu
} from 'lucide-react';
import { usePixelState } from './PixelState';
import { ToolType } from './types';

const TOOLS: Array<{
  type: ToolType;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  tip: string;
}> = [
  { type: 'pencil', icon: Pencil, label: '铅笔', tip: '铅笔工具 (B)' },
  { type: 'eraser', icon: Eraser, label: '橡皮', tip: '橡皮工具 (E)' },
  { type: 'fill', icon: PaintBucket, label: '填充', tip: '填充工具 (G)' },
  { type: 'picker', icon: Pipette, label: '取色', tip: '取色工具 (I)' },
  { type: 'rectangle', icon: Square, label: '矩形', tip: '矩形工具 (R)' },
  { type: 'circle', icon: Circle, label: '圆形', tip: '圆形工具 (C)' }
];

interface ToolBarProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

const ToolBar: React.FC<ToolBarProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { state, dispatch } = usePixelState();
  const currentTool = state.tool.currentTool;

  return (
    <div className="toolbar" style={styles.container}>
      <div style={styles.toolsInner}>
        {onToggleSidebar && (
          <button
            className="toolbar-btn hamburger-btn"
            style={{
              ...styles.toolBtn,
              display: window.innerWidth < 900 ? 'flex' : 'none'
            }}
            onClick={onToggleSidebar}
            title="切换侧边栏"
          >
            <Menu size={20} color="#ffffff" />
          </button>
        )}
        {TOOLS.map(({ type, icon: Icon, label, tip }) => {
          const isActive = currentTool === type;
          return (
            <button
              key={type}
              className={`toolbar-btn ${isActive ? 'active' : ''}`}
              style={{
                ...styles.toolBtn,
                ...(isActive ? styles.toolBtnActive : {}),
                position: 'relative'
              }}
              onClick={() => dispatch({ type: 'SET_TOOL', payload: type })}
              title={tip}
              onMouseEnter={(e) => {
                const tooltip = e.currentTarget.querySelector('.btn-tooltip') as HTMLElement;
                if (tooltip) tooltip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const tooltip = e.currentTarget.querySelector('.btn-tooltip') as HTMLElement;
                if (tooltip) tooltip.style.opacity = '0';
              }}
            >
              <Icon size={18} color={isActive ? '#569cd6' : '#cccccc'} strokeWidth={isActive ? 2.2 : 1.8} />
              <span
                className="btn-tooltip"
                style={{
                  ...styles.tooltip,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bottom: '-30px'
                }}
              >
                {tip}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#2d2d2d',
    borderBottom: '1px solid #444',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    height: '52px',
    boxSizing: 'border-box',
    userSelect: 'none'
  },
  toolsInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  toolBtn: {
    width: '38px',
    height: '38px',
    border: '1px solid #444',
    borderRadius: '6px',
    backgroundColor: '#3c3c3c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s ease',
    outline: 'none',
    color: '#ccc'
  },
  toolBtnActive: {
    backgroundColor: '#1c4f82',
    borderColor: '#569cd6',
    boxShadow: 'inset 0 0 6px rgba(86, 156, 214, 0.4)'
  },
  tooltip: {
    position: 'absolute',
    whiteSpace: 'nowrap',
    backgroundColor: 'rgba(0,0,0,0.85)',
    color: '#569cd6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.15s ease',
    zIndex: 100
  }
};

export default ToolBar;
