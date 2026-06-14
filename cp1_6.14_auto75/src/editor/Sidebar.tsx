import React from 'react';
import EditorState, { ToolMode } from './EditorState';

interface Props {
  editorState: EditorState;
}

const tools: { mode: ToolMode; icon: string; label: string }[] = [
  { mode: 'select', icon: '⬚', label: '选择' },
  { mode: 'platform', icon: '▬', label: '平台' },
  { mode: 'spike', icon: '△', label: '尖刺' },
  { mode: 'goal', icon: '◉', label: '终点' },
];

const Sidebar: React.FC<Props> = ({ editorState }) => {
  const toolMode = editorState.toolMode;

  const handleToolClick = (mode: ToolMode) => {
    editorState.setToolMode(mode);
  };

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
      {tools.map(tool => {
        const isActive = toolMode === tool.mode;
        return (
          <button
            key={tool.mode}
            onClick={() => handleToolClick(tool.mode)}
            title={tool.label}
            style={{
              width: '48px',
              height: '48px',
              minWidth: '48px',
              minHeight: '48px',
              borderRadius: '8px',
              border: 'none',
              background: isActive ? '#ff6b6b' : '#3d3d55',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: 0,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#4d4d65';
              } else {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#3d3d55';
              } else {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {tool.icon}
          </button>
        );
      })}
      <div style={{
        fontSize: '10px',
        color: '#666688',
        marginTop: '16px',
        lineHeight: '1.8',
      }}>
        <div>左键: 放置/选择</div>
        <div>右键/中键: 平移</div>
        <div>滚轮: 缩放 0.5x-2.0x</div>
        <div>Delete: 删除选中</div>
        <div>Esc: 退出预览</div>
      </div>
    </div>
  );
};

export default Sidebar;
