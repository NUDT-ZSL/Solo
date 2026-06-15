import { Highlighter, Type, MousePointer2 } from 'lucide-react';
import { useAppStore } from '@/store';
import type { ToolType } from '@/types';

export function AnnotationToolbar() {
  const currentTool = useAppStore((s) => s.currentTool);
  const setCurrentTool = useAppStore((s) => s.setCurrentTool);

  const tools: { type: ToolType; icon: React.ReactNode; label: string; color: string }[] = [
    { type: 'none', icon: <MousePointer2 size={22} />, label: '选择', color: '#9CA3AF' },
    { type: 'highlight', icon: <Highlighter size={22} />, label: '荧光笔', color: '#FFD700' },
    { type: 'textbox', icon: <Type size={22} />, label: '文本框', color: '#87CEEB' },
  ];

  return (
    <div className="annotation-toolbar">
      {tools.map((tool) => (
        <button
          key={tool.type}
          className={`tool-btn ${currentTool === tool.type ? 'tool-active' : ''}`}
          style={currentTool === tool.type ? { borderColor: '#4A90D9', borderWidth: '2px' } : {}}
          onClick={() => setCurrentTool(tool.type)}
          title={tool.label}
        >
          <span style={{ color: tool.color }}>{tool.icon}</span>
        </button>
      ))}
    </div>
  );
}
