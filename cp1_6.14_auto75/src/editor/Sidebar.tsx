import React from 'react';
import { ToolMode } from '../App';

interface Props {
  toolMode: ToolMode;
  onToolChange: (mode: ToolMode) => void;
}

const tools: { mode: ToolMode; icon: string; label: string }[] = [
  { mode: 'select', icon: '⬚', label: '选择' },
  { mode: 'platform', icon: '▬', label: '平台' },
  { mode: 'spike', icon: '△', label: '尖刺' },
  { mode: 'goal', icon: '◉', label: '终点' },
];

const Sidebar: React.FC<Props> = ({ toolMode, onToolChange }) => {
  return (
    <div style={{
      width: '200px',
      background: '#2d2d3f',
      borderRight: '1px solid #30363d',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      gap: '8px',
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: '11px',
        color: '#8888aa',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '8px',
      }}>
        工具
      </div>
      {tools.map(tool => (
        <button
          key={tool.mode}
          onClick={() => onToolChange(tool.mode)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            border: 'none',
            background: toolMode === tool.mode ? '#ff6b6b' : '#3d3d55',
            color: '#ffffff',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
          onMouseEnter={e => {
            if (toolMode !== tool.mode) {
              e.currentTarget.style.background = '#4d4d65';
            }
          }}
          onMouseLeave={e => {
            if (toolMode !== tool.mode) {
              e.currentTarget.style.background = '#3d3d55';
            }
          }}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
      <div style={{
        fontSize: '10px',
        color: '#666688',
        marginTop: '16px',
        lineHeight: '1.6',
      }}>
        <div>左键: 放置/选择</div>
        <div>右键/中键: 平移</div>
        <div>滚轮: 缩放</div>
        <div>Delete: 删除</div>
        <div>Esc: 退出预览</div>
      </div>
    </div>
  );
};

export default Sidebar;
