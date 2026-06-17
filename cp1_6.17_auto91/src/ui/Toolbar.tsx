import { useState } from 'react';
import { usePipelineStore } from '@/store/pipelineStore';
import type { PipelineType } from '@/data/types';
import { PIPELINE_CONFIGS } from '@/data/types';
import { PRESET_SCHEMES } from '@/data/pipelinePresets';
import { Droplets, Waves, Flame, Zap, Cable, Layers, LayoutGrid, Grid3x3, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';

const PIPELINE_ICONS: Record<PipelineType, any> = {
  water: Droplets,
  drainage: Waves,
  gas: Flame,
  power: Zap,
  communication: Cable,
};

interface ToolbarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Toolbar({ collapsed, onToggleCollapse }: ToolbarProps) {
  const activeType = usePipelineStore((s) => s.activePipelineType);
  const setActiveType = usePipelineStore((s) => s.setActiveType);
  const loadPreset = usePipelineStore((s) => s.loadPreset);
  const clearAll = usePipelineStore((s) => s.clearAll);
  const [clickScale, setClickScale] = useState<string | null>(null);

  const handleClick = (id: string, action: () => void) => {
    setClickScale(id);
    setTimeout(() => setClickScale(null), 100);
    action();
  };

  const btnBase =
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer select-none border-l-4 hover:bg-[#3D3D55] active:scale-95';
  const btnActive = 'bg-[#3D3D55]';
  const btnInactive = 'bg-transparent';

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: '#2D2D44',
        borderRadius: '10px',
        border: '0.3px solid #444466',
        color: '#E0E0E0',
        overflow: 'hidden',
        width: collapsed ? 56 : 240,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#444466]">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide">工具栏</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-[#3D3D55] transition-colors"
          style={{ marginLeft: collapsed ? 'auto' : 0 }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="text-[10px] uppercase tracking-widest text-[#8888aa] px-3 pt-4 pb-2 font-medium">
          管线类型
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
        {(Object.keys(PIPELINE_CONFIGS) as PipelineType[]).map((type) => {
          const Icon = PIPELINE_ICONS[type];
          const cfg = PIPELINE_CONFIGS[type];
          const isActive = activeType === type;
          const btnId = `type_${type}`;
          return (
            <button
              key={type}
              onClick={() => handleClick(btnId, () => setActiveType(type))}
              className={`${btnBase} ${isActive ? btnActive : btnInactive}`}
              style={{
                borderLeftColor: cfg.color,
                transform: clickScale === btnId ? 'scale(0.95)' : 'scale(1)',
                boxShadow: isActive ? `inset 0 0 0 1px ${cfg.color}44` : 'none',
              }}
              title={cfg.label}
            >
              <Icon size={18} style={{ color: cfg.color, flexShrink: 0 }} />
              {!collapsed && (
                <div className="flex-1 flex flex-col items-start text-left">
                  <span className="text-sm font-medium">{cfg.label}</span>
                  <span className="text-[10px] text-[#8888aa]">
                    半径 {cfg.radius.toFixed(2)}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!collapsed && (
        <div className="text-[10px] uppercase tracking-widest text-[#8888aa] px-3 pt-4 pb-2 font-medium">
          预设方案
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
        {(['A', 'B', 'C'] as const).map((id) => {
          const scheme = PRESET_SCHEMES[id];
          const IconComp = id === 'A' ? Layers : id === 'B' ? LayoutGrid : Grid3x3;
          const btnId = `scheme_${id}`;
          return (
            <button
              key={id}
              onClick={() => handleClick(btnId, () => loadPreset(scheme))}
              className={`${btnBase} ${btnInactive}`}
              style={{
                borderLeftColor: '#6366F1',
                transform: clickScale === btnId ? 'scale(0.95)' : 'scale(1)',
              }}
              title={scheme.name}
            >
              <IconComp size={18} style={{ color: '#6366F1', flexShrink: 0 }} />
              {!collapsed && (
                <div className="flex-1 flex flex-col items-start text-left">
                  <span className="text-sm font-medium">方案 {id}</span>
                  <span className="text-[10px] text-[#8888aa] line-clamp-1" style={{ maxWidth: 160 }}>
                    {scheme.description}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: collapsed ? '0 8px 12px' : '16px 8px 12px' }}>
        <button
          onClick={() => handleClick('clear', clearAll)}
          className={`${btnBase} ${btnInactive}`}
          style={{
            borderLeftColor: '#F44336',
            transform: clickScale === 'clear' ? 'scale(0.95)' : 'scale(1)',
          }}
          title="清空场景"
        >
          <Trash2 size={18} style={{ color: '#F44336', flexShrink: 0 }} />
          {!collapsed && <span className="text-sm font-medium">清空场景</span>}
        </button>
      </div>
    </div>
  );
}
