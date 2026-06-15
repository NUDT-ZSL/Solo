import React from 'react';

export type ToolMode = 'select' | 'brush' | 'eyedropper' | 'clear' | 'export';

interface ToolbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  compact?: boolean;
}

const TOOLS: { mode: ToolMode; icon: string; label: string }[] = [
  { mode: 'select', icon: '⊹', label: '选择' },
  { mode: 'brush', icon: '✦', label: '画笔' },
  { mode: 'eyedropper', icon: '◎', label: '吸色' },
  { mode: 'clear', icon: '✕', label: '清空' },
  { mode: 'export', icon: '⤓', label: '导出' },
];

const Toolbar: React.FC<ToolbarProps> = ({ mode, onModeChange, compact }) => {
  const visibleTools = compact ? TOOLS.slice(0, 4) : TOOLS;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: 'center',
        gap: compact ? '8px' : '12px',
        background: '#16162a',
        padding: compact ? '8px 12px' : '12px 10px',
        borderRadius: compact ? '12px' : '0',
        width: compact ? 'auto' : '60px',
        justifyContent: 'center',
      }}
    >
      {visibleTools.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => onModeChange(tool.mode)}
          title={tool.label}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: 'none',
            background: mode === tool.mode ? '#2d2d4a' : 'transparent',
            color: mode === tool.mode ? '#c7d2fe' : '#a5b4fc',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease-out, color 0.2s ease-out, transform 0.1s ease-out',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#2d2d4a';
            (e.currentTarget as HTMLElement).style.color = '#c7d2fe';
          }}
          onMouseLeave={(e) => {
            if (mode !== tool.mode) {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#a5b4fc';
            }
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
