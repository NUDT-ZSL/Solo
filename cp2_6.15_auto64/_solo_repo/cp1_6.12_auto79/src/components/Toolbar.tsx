import React from 'react';
import { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ currentTool, onToolChange, onExport }) => {
  const tools: { type: ToolType; icon: string; label: string }[] = [
    { type: 'draw', icon: '✏️', label: '绘制' },
    { type: 'select', icon: '👆', label: '选择' },
    { type: 'delete', icon: '🗑️', label: '删除' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: '#2b2b3c',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: '48px',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '4px',
          background: '#1e1e2e',
          borderRadius: '8px',
          padding: '2px',
        }}
      >
        {tools.map(tool => (
          <button
            key={tool.type}
            onClick={() => onToolChange(tool.type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: "'Inter', sans-serif",
              background: currentTool === tool.type ? '#45475a' : 'transparent',
              color: currentTool === tool.type ? '#cdd6f4' : '#6c7086',
              transition: 'all 200ms ease-out',
              transform: currentTool === tool.type ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={e => {
              if (currentTool !== tool.type) {
                (e.currentTarget as HTMLButtonElement).style.background = '#313244';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={e => {
              if (currentTool !== tool.type) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            }}
          >
            <span>{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={onExport}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 16px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          background: 'linear-gradient(135deg, #89b4fa, #74c7ec)',
          color: '#1e1e2e',
          transition: 'all 200ms ease-out',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(137,180,250,0.3)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }}
        onMouseDown={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
        }}
      >
        <span>📥</span>
        <span>导出 JSON</span>
      </button>
    </div>
  );
};

export default Toolbar;
