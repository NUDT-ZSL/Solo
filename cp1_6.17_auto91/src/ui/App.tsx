import { useEffect, useState } from 'react';
import { PipelineScene } from '@/render/PipelineScene';
import { Toolbar } from './Toolbar';
import { ReportPanel } from './ReportPanel';
import { usePipelineStore } from '@/store/pipelineStore';
import { PRESET_SCHEMES } from '@/data/pipelinePresets';
import { Eye, Layers, CheckCircle } from 'lucide-react';

export function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const pipelines = usePipelineStore((s) => s.pipelines);
  const collisions = usePipelineStore((s) => s.collisions);
  const selectedId = usePipelineStore((s) => s.selectedPipelineId);
  const loadPreset = usePipelineStore((s) => s.loadPreset);

  const resolvedCount = collisions.filter((c) => c.resolved).length;
  const selectedCount = selectedId ? 1 : 0;

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 1200) {
        setLeftCollapsed(true);
        setRightCollapsed(true);
      } else {
        setLeftCollapsed(false);
        setRightCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadPreset(PRESET_SCHEMES.C);
  }, [loadPreset]);

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ background: '#1E1E2E', minWidth: 1024, minHeight: 600 }}
    >
      <div className="flex-1 flex gap-2 p-2" style={{ minHeight: 0 }}>
        <Toolbar collapsed={leftCollapsed} onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)} />

        <div
          className="flex-1 flex flex-col rounded-lg overflow-hidden relative"
          style={{
            borderRadius: '10px',
            border: '0.3px solid #444466',
            background: '#1E1E2E',
            minWidth: 0,
          }}
        >
          <div className="flex-1 relative">
            <PipelineScene />
            <div
              className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg pointer-events-none"
              style={{
                background: 'rgba(45,45,68,0.85)',
                border: '0.3px solid #444466',
                color: '#E0E0E0',
                fontSize: 12,
                backdropFilter: 'blur(4px)',
              }}
            >
              <span className="text-[#8888aa]">提示：</span>
              <span>左键点击地块绘制管线，右键拖动旋转视角，滚轮缩放</span>
            </div>
          </div>

          <div
            className="flex items-center gap-6 px-4"
            style={{
              height: 32,
              background: '#2D2D44',
              opacity: 0.8,
              color: '#E0E0E0',
              borderTop: '0.3px solid #444466',
            }}
          >
            <div className="flex items-center gap-2 text-xs">
              <Eye size={14} style={{ color: '#6366F1' }} />
              <span className="text-[#8888aa]">选中管线:</span>
              <span className="font-mono font-semibold" style={{ color: '#6366F1' }}>
                {selectedCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Layers size={14} style={{ color: '#FF5252' }} />
              <span className="text-[#8888aa]">总碰撞数:</span>
              <span className="font-mono font-semibold" style={{ color: '#FF5252' }}>
                {collisions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle size={14} style={{ color: '#4CAF50' }} />
              <span className="text-[#8888aa]">已解决:</span>
              <span className="font-mono font-semibold" style={{ color: '#4CAF50' }}>
                {resolvedCount}
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs text-[#8888aa]">
              <Layers size={12} />
              <span>管线条数: {pipelines.length}</span>
            </div>
          </div>
        </div>

        <ReportPanel collapsed={rightCollapsed} onToggleCollapse={() => setRightCollapsed(!rightCollapsed)} />
      </div>
    </div>
  );
}
