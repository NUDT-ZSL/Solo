import {
  MousePointer2,
  Square,
  Minimize2,
  Circle,
  Save,
  FolderOpen,
  Trash2,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useExhibitionStore } from '@/store';
import { ToolType } from '@/types';

const tools: { type: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { type: 'select', icon: MousePointer2, label: '选择' },
  { type: 'rectangle', icon: Square, label: '矩形' },
  { type: 'L-shape', icon: Minimize2, label: 'L形' },
  { type: 'arc', icon: Circle, label: '弧形' },
];

export default function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
  };

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#1e293b] border-b border-[#334155] z-40">
      <div className="flex items-center justify-between h-full px-4">
        <h1 className="text-sm font-semibold text-[#f1f5f9]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          展览设计器
        </h1>
        <div className="flex items-center gap-1">
          {tools.map(({ type, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setSelectedTool(type)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                selectedTool === type
                  ? 'bg-[#6366f1] text-white'
                  : 'text-[#94a3b8] hover:bg-[#334155]'
              }`}
            >
              <Icon size={18} />
            </button>
          ))}
          <div className="w-px h-6 bg-[#334155] mx-1" />
          <button
            onClick={newExhibition}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#334155]"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => handleAction('save')}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#334155]"
          >
            <Save size={18} />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#334155]"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="absolute top-14 right-2 bg-[#1e293b] border border-[#334155] rounded-xl shadow-xl p-2 min-w-32">
          <button
            onClick={() => handleAction('load')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#f1f5f9] hover:bg-[#334155] rounded-lg transition-colors"
          >
            <FolderOpen size={16} />
            加载方案
          </button>
          <button
            onClick={() => handleAction('delete')}
            disabled={!selectedWallId && !selectedExhibitId}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              !selectedWallId && !selectedExhibitId
                ? 'text-[#475569] cursor-not-allowed'
                : 'text-[#f1f5f9] hover:bg-[#334155]'
            }`}
          >
            <Trash2 size={16} />
            删除选中
          </button>
        </div>
      )}
    </div>
  );
}
