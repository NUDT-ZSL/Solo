import { MousePointer2, Square, Minimize2, Circle, Save, FolderOpen, Trash2, Plus } from 'lucide-react';
import { useExhibitionStore } from '@/store';
import { ToolType } from '@/types';

const tools: { type: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { type: 'select', icon: MousePointer2, label: '选择' },
  { type: 'rectangle', icon: Square, label: '矩形展墙' },
  { type: 'L-shape', icon: Minimize2, label: 'L形展墙' },
  { type: 'arc', icon: Circle, label: '弧形展墙' },
];

const actionTools: { type: ToolType; icon: typeof Save; label: string }[] = [
  { type: 'save', icon: Save, label: '保存' },
  { type: 'load', icon: FolderOpen, label: '加载' },
  { type: 'delete', icon: Trash2, label: '删除' },
];

export default function Toolbar() {
  const {
    selectedTool,
    setSelectedTool,
    saveExhibition,
    setShowLoadModal,
    deleteWall,
    deleteExhibit,
    selectedWallId,
    selectedExhibitId,
    newExhibition,
  } = useExhibitionStore();

  const handleAction = (type: ToolType) => {
    if (type === 'save') {
      saveExhibition();
    } else if (type === 'load') {
      setShowLoadModal(true);
    } else if (type === 'delete') {
      if (selectedWallId) {
        deleteWall(selectedWallId);
      } else if (selectedExhibitId) {
        deleteExhibit(selectedExhibitId);
      }
    }
  };

  return (
    <div className="hidden lg:flex flex-col w-16 bg-[#1e293b] border-r border-[#334155] items-center py-4 gap-2">
      <button
        onClick={newExhibition}
        className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#6366f1] text-white hover:bg-[#4f46e5] transition-all duration-200 mb-2"
        title="新建方案"
      >
        <Plus size={24} />
      </button>

      <div className="w-12 h-px bg-[#334155] mb-2" />

      {tools.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => setSelectedTool(type)}
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 group relative ${
            selectedTool === type
              ? 'bg-[#6366f1] text-white'
              : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#6366f1]'
          }`}
          title={label}
        >
          <Icon size={22} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#1e293b] border border-[#334155] rounded text-xs text-[#f1f5f9] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {label}
          </span>
        </button>
      ))}

      <div className="w-12 h-px bg-[#334155] my-2" />

      {actionTools.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => handleAction(type)}
          disabled={type === 'delete' && !selectedWallId && !selectedExhibitId}
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 group relative ${
            type === 'delete' && !selectedWallId && !selectedExhibitId
              ? 'text-[#475569] cursor-not-allowed'
              : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#6366f1]'
          }`}
          title={label}
        >
          <Icon size={22} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#1e293b] border border-[#334155] rounded text-xs text-[#f1f5f9] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
