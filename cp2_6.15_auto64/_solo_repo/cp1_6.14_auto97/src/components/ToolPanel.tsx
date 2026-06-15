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

const SquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeLinejoin="round">
    <rect x="3" y="3" width="14" height="14" rx="2" />
  </svg>
);

const CircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7" />
  </svg>
);

const SlopeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3,17 17,3 17,17" />
  </svg>
);

const EraserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L10 5L15 10L8 17H3V12Z" />
    <line x1="6" y1="14" x2="10" y2="10" />
  </svg>
);

const BrushSize8Icon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="8" height="8" rx="1" />
  </svg>
);

const BrushSize16Icon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="16" height="16" rx="1" />
    <rect x="6" y="6" width="8" height="8" rx="1" opacity="0.5" />
  </svg>
);

const BrushSize32Icon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="18" height="18" rx="1" />
    <rect x="5" y="5" width="10" height="10" rx="1" opacity="0.5" />
    <rect x="8" y="8" width="4" height="4" rx="0.5" opacity="0.3" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <polygon points="4,2 14,8 4,14" />
  </svg>
);

const StopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="4" y="3" width="3" height="10" rx="1" />
    <rect x="9" y="3" width="3" height="10" rx="1" />
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14v-4H5" />
    <path d="M9 5a5 5 0 0 1 5 5 5 5 0 0 1-5 5H5" />
  </svg>
);

const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14v-4h4" />
    <path d="M9 5a5 5 0 0 0-5 5 5 5 0 0 0 5 5h4" />
  </svg>
);

const brushTools: { id: ToolType; label: string; icon: React.ReactElement }[] = [
  { id: 'square', label: '方形笔刷', icon: <SquareIcon /> },
  { id: 'circle', label: '圆形笔刷', icon: <CircleIcon /> },
  { id: 'slope', label: '斜坡笔刷', icon: <SlopeIcon /> },
  { id: 'eraser', label: '橡皮擦', icon: <EraserIcon /> }
];

const entityTools: { id: ToolType; label: string; color: string }[] = [
  { id: 'player', label: '玩家', color: '#4a90d9' },
  { id: 'enemy-red', label: '红色敌人', color: '#e74c3c' },
  { id: 'enemy-purple', label: '紫色敌人', color: '#9b59b6' }
];

const brushSizeOptions: { size: BrushSize; label: string; icon: React.ReactElement }[] = [
  { size: 8, label: '8px', icon: <BrushSize8Icon /> },
  { size: 16, label: '16px', icon: <BrushSize16Icon /> },
  { size: 32, label: '32px', icon: <BrushSize32Icon /> }
];

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
      gap: 14,
      borderRight: '1px solid #1e1e2e',
      overflowY: 'auto',
      height: '100%'
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
              disabled={isSimulating}
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: isSelected ? '#ff6b6b' : 'transparent',
                border: isSelected ? '1px solid #ff6b6b' : '1px solid #2a2a3e',
                color: isSelected ? '#ffffff' : '#e0e0e0',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                justifySelf: 'center',
                opacity: isSimulating ? 0.4 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isSimulating) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a5e';
                  (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isSimulating) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3e';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
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
        {brushSizeOptions.map(opt => {
          const isSelected = brushSize === opt.size;
          return (
            <button
              key={opt.size}
              onClick={() => onBrushSizeChange(opt.size)}
              title={opt.label}
              disabled={isSimulating}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 6,
                background: isSelected ? '#ff6b6b' : 'transparent',
                border: isSelected ? '1px solid #ff6b6b' : '1px solid #2a2a3e',
                color: isSelected ? '#ffffff' : '#cccccc',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                opacity: isSimulating ? 0.4 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isSimulating) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a5e';
                  (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isSimulating) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3e';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              {opt.icon}
              <span style={{ fontSize: 9, marginTop: 2 }}>{opt.size}</span>
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
        放置实体
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
              disabled={isSimulating}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: isSelected ? tool.color + '33' : 'transparent',
                border: isSelected ? `1px solid ${tool.color}` : '1px solid #2a2a3e',
                color: '#e0e0e0',
                fontSize: 12,
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                opacity: isSimulating ? 0.4 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isSimulating) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a5e';
                  (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isSimulating) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3e';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              <div style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: tool.color,
                flexShrink: 0
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
          transition: 'background 0.2s ease, transform 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = isSimulating ? '#c0392b' : '#00e676';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = isSimulating ? '#e74c3c' : '#00c853';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
        }}
      >
        {isSimulating ? <StopIcon /> : <PlayIcon />}
        {isSimulating ? '停止测试' : '测试运行'}
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
          onMouseEnter={(e) => {
            if (!isSimulating) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a5e';
              (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSimulating) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3e';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }
          }}
        >
          <UndoIcon />
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
          onMouseEnter={(e) => {
            if (!isSimulating) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a5e';
              (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSimulating) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3e';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }
          }}
        >
          <RedoIcon />
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
            (e.currentTarget as HTMLButtonElement).style.background = '#e74c3c22';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e74c3c';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSimulating) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a2a2a';
          }
        }}
      >
        清空地形
      </button>

      <div style={{
        marginTop: 'auto',
        paddingTop: 12,
        fontSize: 10,
        color: '#555555',
        lineHeight: 1.8
      }}>
        <div style={{ fontWeight: 600, color: '#666666', marginBottom: 6 }}>操作说明</div>
        <div>鼠标左键：绘制 / 放置</div>
        <div>A/D 或 ←/→：移动</div>
        <div>空格 / W / ↑：跳跃</div>
        <div>Ctrl+Z：撤销</div>
        <div>Ctrl+Y：重做</div>
      </div>
    </div>
  );
};

export default ToolPanel;
