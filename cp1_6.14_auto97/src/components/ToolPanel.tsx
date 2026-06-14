import React from 'react';
import type { ToolType, BrushSize } from '../canvasEngine';

interface ToolPanelProps {
  selectedTool: ToolType;
  brushSize: BrushSize;
  isSimulating: boolean;
  onToolChange: (tool: ToolType) => void;
  onBrushSizeChange: (size: BrushSize) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToggleSimulation: () => void;
}

const brushTools: { id: ToolType; label: string; icon: JSX.Element }[] = [
  {
    id: 'square',
    label: '方形笔刷',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2" />
      </svg>
    )
  },
  {
    id: 'circle',
    label: '圆形笔刷',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
      </svg>
    )
  },
  {
    id: 'slope',
    label: '斜坡笔刷',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3,17 17,3 17,17" />
      </svg>
    )
  },
  {
    id: 'eraser',
    label: '橡皮擦',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L10 5L15 10L8 17H3V12Z" />
        <line x1="6" y1="14" x2="10" y2="10" />
      </svg>
    )
  }
];

const entityTools: { id: ToolType; label: string; color: string }[] = [
  { id: 'player', label: '玩家', color: '#4a90d9' },
  { id: 'enemy-red', label: '红敌人', color: '#e74c3c' },
  { id: 'enemy-purple', label: '紫敌人', color: '#9b59b6' }
];

const brushSizes: BrushSize[] = [8, 16, 32];

const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedTool,
  brushSize,
  isSimulating,
  onToolChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  onToggleSimulation
}) => {
  return (
    <div style={{
      width: 200,
      minWidth: 200,
      background: '#12121e',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      borderRight: '1px solid #1e1e2e',
      overflowY: 'auto'
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#e0e0e0',
        letterSpacing: 1,
        textTransform: 'uppercase'
      }}>
        工具栏
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8
      }}>
        {brushTools.map(tool => {
          const isSelected = selectedTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              title={tool.label}
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: isSelected ? '#ff6b6b' : 'transparent',
                border: isSelected ? '1px solid #ff6b6b' : '1px solid #2a2a3e',
                color: isSelected ? '#ffffff' : '#e0e0e0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                justifySelf: 'center'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.target as HTMLButtonElement).style.borderColor = '#3a3a5e';
                  (e.target as HTMLButtonElement).style.background = '#1a1a2e';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.target as HTMLButtonElement).style.borderColor = '#2a2a3e';
                  (e.target as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>

      <div style={{
        height: 1,
        background: '#1e1e2e',
        margin: '4px 0'
      }} />

      <div style={{
        fontSize: 11,
        color: '#888888',
        textTransform: 'uppercase',
        letterSpacing: 0.5
      }}>
        笔刷大小
      </div>
      <div style={{
        display: 'flex',
        gap: 8
      }}>
        {brushSizes.map(size => {
          const isSelected = brushSize === size;
          return (
            <button
              key={size}
              onClick={() => onBrushSizeChange(size)}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 6,
                background: isSelected ? '#ff6b6b' : 'transparent',
                border: isSelected ? '1px solid #ff6b6b' : '1px solid #2a2a3e',
                color: isSelected ? '#ffffff' : '#cccccc',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {size}px
            </button>
          );
        })}
      </div>

      <div style={{
        height: 1,
        background: '#1e1e2e',
        margin: '4px 0'
      }} />

      <div style={{
        fontSize: 11,
        color: '#888888',
        textTransform: 'uppercase',
        letterSpacing: 0.5
      }}>
        实体
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}>
        {entityTools.map(tool => {
          const isSelected = selectedTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: isSelected ? tool.color + '33' : 'transparent',
                border: isSelected ? `1px solid ${tool.color}` : '1px solid #2a2a3e',
                color: '#e0e0e0',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <div style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: tool.color
              }} />
              {tool.label}
            </button>
          );
        })}
      </div>

      <div style={{
        height: 1,
        background: '#1e1e2e',
        margin: '4px 0'
      }} />

      <button
        onClick={onToggleSimulation}
        style={{
          width: '100%',
          height: 44,
          borderRadius: 8,
          background: isSimulating ? '#e74c3c' : '#00c853',
          border: 'none',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = isSimulating ? '#c0392b' : '#00e676';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = isSimulating ? '#e74c3c' : '#00c853';
        }}
      >
        {isSimulating ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="4" y="3" width="3" height="10" rx="1" />
              <rect x="9" y="3" width="3" height="10" rx="1" />
            </svg>
            停止测试
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="4,2 14,8 4,14" />
            </svg>
            测试运行
          </>
        )}
      </button>

      <div style={{
        height: 1,
        background: '#1e1e2e',
        margin: '4px 0'
      }} />

      <div style={{
        display: 'flex',
        gap: 8
      }}>
        <button
          onClick={onUndo}
          disabled={isSimulating}
          title="撤销 (Ctrl+Z)"
          style={{
            flex: 1,
            height: 36,
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid #2a2a3e',
            color: isSimulating ? '#444444' : '#cccccc',
            cursor: isSimulating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14v-4H5" />
            <path d="M9 5a5 5 0 0 1 5 5 5 5 0 0 1-5 5H5" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={isSimulating}
          title="重做 (Ctrl+Y)"
          style={{
            flex: 1,
            height: 36,
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid #2a2a3e',
            color: isSimulating ? '#444444' : '#cccccc',
            cursor: isSimulating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14v-4h4" />
            <path d="M9 5a5 5 0 0 0-5 5 5 5 0 0 0 5 5h4" />
          </svg>
        </button>
      </div>

      <button
        onClick={onClear}
        disabled={isSimulating}
        style={{
          height: 36,
          borderRadius: 6,
          background: 'transparent',
          border: '1px solid #3a2a2a',
          color: isSimulating ? '#444444' : '#e74c3c',
          fontSize: 12,
          cursor: isSimulating ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!isSimulating) {
            (e.target as HTMLButtonElement).style.background = '#e74c3c22';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSimulating) {
            (e.target as HTMLButtonElement).style.background = 'transparent';
          }
        }}
      >
        清空地形
      </button>

      <div style={{
        marginTop: 'auto',
        paddingTop: 16,
        fontSize: 10,
        color: '#555555',
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 600, color: '#666666', marginBottom: 6 }}>快捷键</div>
        <div>A/D 或 ←/→: 移动</div>
        <div>空格 / W / ↑: 跳跃</div>
        <div>Ctrl+Z: 撤销</div>
        <div>Ctrl+Y: 重做</div>
      </div>
    </div>
  );
};

export default ToolPanel;
