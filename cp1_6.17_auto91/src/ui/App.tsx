import { useEffect, useState } from 'react';
import { PipelineScene } from '@/render/PipelineScene';
import { Toolbar } from './Toolbar';
import { ReportPanel } from './ReportPanel';
import { usePipelineStore } from '@/store/pipelineStore';
import { PRESET_SCHEMES } from '@/data/pipelinePresets';
import { Eye, Layers, CheckCircle, Info } from 'lucide-react';

export function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  const pipelines = usePipelineStore((s) => s.pipelines);
  const collisions = usePipelineStore((s) => s.collisions);
  const selectedId = usePipelineStore((s) => s.selectedPipelineId);
  const loadPreset = usePipelineStore((s) => s.loadPreset);
  const activeType = usePipelineStore((s) => s.activePipelineType);
  const isDrawing = usePipelineStore((s) => s.isDrawing);

  const resolvedCount = collisions.filter((c) => c.resolved).length;
  const selectedCount = selectedId ? 1 : 0;

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
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
    const t = setTimeout(() => loadPreset(PRESET_SCHEMES.C), 100);
    return () => clearTimeout(t);
  }, [loadPreset]);

  const totalSegments = pipelines.reduce((acc, p) => acc + p.segments.length, 0);

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{
        background: '#1E1E2E',
        minWidth: 1024,
        minHeight: 600,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
      }}
    >
      <div className="flex-1 flex gap-2 p-2" style={{ minHeight: 0 }}>
        <Toolbar
          collapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
        />

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
                backdropFilter: 'blur(6px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <Info size={13} style={{ color: '#6366F1', flexShrink: 0 }} />
              <span className="text-[#aaaacc]">提示：</span>
              <span>
                左键地块<em style={{ color: '#7DD3FC', fontStyle: 'normal' }}> 点击+拖拽 </em>
                绘制管线 · 右键拖动旋转 · 滚轮缩放
              </span>
            </div>

            {isDrawing && (
              <div
                className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-lg pointer-events-none"
                style={{
                  background: isDrawing
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.9))'
                    : 'rgba(45,45,68,0.85)',
                  border: '0.3px solid #818CF8',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  animation: 'drawPulse 1.5s ease-in-out infinite',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: '#fff',
                    boxShadow: '0 0 8px #fff',
                  }}
                />
                <span>
                  正在绘制：
                  <span style={{ color: '#E0E7FF' }}>
                    {activeType === 'water' && '给水'}
                    {activeType === 'drainage' && '排水'}
                    {activeType === 'gas' && '燃气'}
                    {activeType === 'power' && '电力'}
                    {activeType === 'communication' && '通信'}
                  </span>
                  管线
                </span>
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-6 px-4"
            style={{
              height: 32,
              background: '#2D2D44',
              opacity: 0.85,
              color: '#E0E0E0',
              borderTop: '0.3px solid #444466',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="flex items-center gap-2 text-xs">
              <Eye size={14} style={{ color: '#6366F1', flexShrink: 0 }} />
              <span className="text-[#8888aa]">选中管线:</span>
              <span
                className="font-mono font-semibold"
                style={{ color: selectedCount > 0 ? '#6366F1' : '#666688' }}
              >
                {selectedCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Layers size={14} style={{ color: '#FF5252', flexShrink: 0 }} />
              <span className="text-[#8888aa]">总碰撞数:</span>
              <span
                className="font-mono font-semibold"
                style={{ color: collisions.length > 0 ? '#FF5252' : '#4CAF50' }}
              >
                {collisions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle size={14} style={{ color: '#4CAF50', flexShrink: 0 }} />
              <span className="text-[#8888aa]">已解决:</span>
              <span
                className="font-mono font-semibold"
                style={{
                  color:
                    resolvedCount === collisions.length && collisions.length > 0
                      ? '#4CAF50'
                      : resolvedCount > 0
                      ? '#8BC34A'
                      : '#666688',
                }}
              >
                {resolvedCount}
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-4 text-xs text-[#8888aa]">
              <div className="flex items-center gap-1.5">
                <Layers size={11} />
                <span>管线: {pipelines.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>段数: {totalSegments}</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                style={{
                  color: windowWidth < 1200 ? '#FFC107' : '#666688',
                }}
              >
                <span>窗口: {windowWidth}px</span>
              </div>
            </div>
          </div>
        </div>

        <ReportPanel
          collapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
        />
      </div>

      <style>{`
        @keyframes drawPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(99,102,241,0.3); }
          50% { box-shadow: 0 4px 24px rgba(99,102,241,0.5), 0 0 0 1px #A5B4FC; }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #444466;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #555577;
        }
      `}</style>
    </div>
  );
}
