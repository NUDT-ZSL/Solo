import { usePipelineStore } from '@/store/pipelineStore';
import type { PipelineType } from '@/store/types';
import { PIPELINE_CONFIGS } from '@/store/types';
import { ChevronRight, ChevronLeft, Check, AlertTriangle } from 'lucide-react';

const TYPE_LABEL: Record<PipelineType, string> = {
  water: '给水',
  drainage: '排水',
  gas: '燃气',
  power: '电力',
  communication: '通信',
};

interface ReportPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ReportPanel({ collapsed, onToggleCollapse }: ReportPanelProps) {
  const collisions = usePipelineStore((s) => s.collisions);
  const hoveredId = usePipelineStore((s) => s.hoveredCollisionId);
  const setHovered = usePipelineStore((s) => s.setHoveredCollision);
  const toggleResolved = usePipelineStore((s) => s.toggleCollisionResolved);

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: '#2D2D44',
        borderRadius: '10px',
        border: '0.3px solid #444466',
        color: '#E0E0E0',
        overflow: 'hidden',
        width: collapsed ? 56 : 300,
        transition: 'width 0.3s ease',
      }}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#444466]">
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-[#3D3D55] transition-colors"
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} color="#FF5252" />
            <span className="text-sm font-semibold tracking-wide">碰撞报告</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: '#FF525233', color: '#FF5252' }}
            >
              {collisions.length}
            </span>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto" style={{ padding: '8px' }}>
          {collisions.length === 0 ? (
            <div
              className="h-full flex flex-col items-center justify-center gap-2 text-[#8888aa]"
              style={{ minHeight: 200 }}
            >
              <Check size={32} style={{ opacity: 0.5 }} />
              <span className="text-sm">暂无碰撞</span>
              <span className="text-xs">管线布局安全</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {collisions.map((c) => {
                const isHovered = hoveredId === c.id;
                const cfgA = PIPELINE_CONFIGS[c.typeA];
                const cfgB = PIPELINE_CONFIGS[c.typeB];
                return (
                  <div
                    key={c.id}
                    onMouseEnter={() => setHovered(c.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => toggleResolved(c.id)}
                    className="flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: isHovered ? '#3D3D55' : 'transparent',
                      border: isHovered ? '1px solid #FF525255' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="mt-0.5 flex-shrink-0 rounded-full"
                      style={{
                        width: 10,
                        height: 10,
                        background: c.resolved ? '#4CAF50' : '#FF5252',
                        boxShadow: c.resolved
                          ? '0 0 6px #4CAF50'
                          : isHovered
                          ? '0 0 10px #FF5252'
                          : '0 0 4px #FF525288',
                        animation: !c.resolved && isHovered ? 'pulse 0.5s infinite' : undefined,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: cfgA.color }}
                          />
                          <span className="text-xs font-medium" style={{ color: cfgA.color }}>
                            {TYPE_LABEL[c.typeA]}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8888aa]">×</span>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: cfgB.color }}
                          />
                          <span className="text-xs font-medium" style={{ color: cfgB.color }}>
                            {TYPE_LABEL[c.typeB]}
                          </span>
                        </div>
                      </div>
                      <div
                        className="text-[10px] px-1.5 py-0.5 rounded inline-block mb-1"
                        style={{
                          background:
                            c.collisionType === 'horizontal' ? '#FF525222' : '#FFC10722',
                          color: c.collisionType === 'horizontal' ? '#FF5252' : '#FFC107',
                        }}
                      >
                        {c.collisionType === 'horizontal' ? '水平重叠' : '垂直交叉'}
                      </div>
                      <div className="text-[10px] text-[#8888aa] font-mono">
                        X: {c.position.x.toFixed(2)} Y: {c.position.y.toFixed(2)} Z: {c.position.z.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#8888aa] mt-0.5">
                        间距: {c.distance.toFixed(2)} 单位
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {collapsed && (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-xs px-1.5 py-1 rounded"
            style={{ background: '#FF525233', color: '#FF5252', writingMode: 'vertical-rl' }}
          >
            {collisions.length} 碰撞
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
