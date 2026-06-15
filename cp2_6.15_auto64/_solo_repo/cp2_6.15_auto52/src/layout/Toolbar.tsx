import React from 'react';
import { MousePointer2, Square, Minus, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ToolType } from '@/types';

const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
  { type: 'select', icon: <MousePointer2 size={20} />, label: '选择 (V)' },
  { type: 'wall', icon: <Minus size={20} />, label: '添加展墙 (W)' },
  { type: 'stand', icon: <Square size={20} />, label: '添加展台 (S)' },
  { type: 'delete', icon: <Trash2 size={20} />, label: '删除 (D)' },
];

export const Toolbar: React.FC = () => {
  const selectedTool = useStore((state) => state.selectedTool);
  const setSelectedTool = useStore((state) => state.setSelectedTool);
  const isMobile = useStore((state) => state.isMobile);

  const handleToolClick = (type: ToolType) => {
    setSelectedTool(type);
  };

  return (
    <div
      className={`
        flex items-center justify-center gap-3 p-3 bg-[#33334d]
        ${isMobile ? 'flex-row h-16 w-full border-t border-[#444466]' : 'flex-col w-16 h-full border-r border-[#444466]'}
        transition-all duration-300 ease-out
      `}
    >
      {tools.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => handleToolClick(type)}
          title={label}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-300 ease-out
            ${selectedTool === type
              ? 'border-2 border-[#6c63ff] bg-[#6c63ff]/20 text-[#6c63ff]'
              : 'border-2 border-transparent text-[#a0a0c0] hover:text-[#e0e0ff] hover:bg-[#444466]'
            }
          `}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};
