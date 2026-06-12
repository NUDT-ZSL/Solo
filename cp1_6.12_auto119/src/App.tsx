import { useRef, useState, useCallback } from 'react';
import MaterialPanel from './MaterialPanel';
import SceneController, { type SceneControllerRef } from './SceneController';
import { useMaterialStore } from './store/materialStore';

export default function App() {
  const sceneRef = useRef<SceneControllerRef>(null);
  const [fps, setFps] = useState(0);
  const isCompareMode = useMaterialStore((s) => s.isCompareMode);
  const splitRatio = useMaterialStore((s) => s.splitRatio);
  const toggleCompareMode = useMaterialStore((s) => s.toggleCompareMode);
  const setSplitRatio = useMaterialStore((s) => s.setSplitRatio);

  const handleFpsUpdate = useCallback((v: number) => {
    setFps(v);
  }, []);

  const handleSplitRatioChange = useCallback(
    (ratio: number) => {
      setSplitRatio(ratio);
    },
    [setSplitRatio]
  );

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        fontFamily: "'Noto Sans SC', 'Roboto', sans-serif",
        background: '#1A1A1A',
      }}
    >
      <MaterialPanel />

      <div
        style={{
          flex: 1,
          position: 'relative',
          minWidth: 0,
          height: '100%',
          background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F7FA 100%)',
        }}
      >
        <SceneController
          ref={sceneRef}
          isCompareMode={isCompareMode}
          splitRatio={splitRatio}
          onSplitRatioChange={handleSplitRatioChange}
          onFpsUpdate={handleFpsUpdate}
        />

        <button
          onClick={toggleCompareMode}
          title={isCompareMode ? '关闭对比模式' : '开启对比模式'}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#FF7043',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(255, 112, 67, 0.4)',
            transition: 'background 0.2s ease-out, transform 0.2s ease-out, box-shadow 0.2s ease-out',
            zIndex: 100,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#F4511E';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#FF7043';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 12 }}>◀</span>
            <span style={{ fontSize: 12 }}>▶</span>
          </span>
        </button>

        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            padding: '8px 14px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: fps >= 30 ? '#81C784' : '#FFB74D',
            fontSize: 12,
            fontFamily: "'Roboto', monospace",
            borderRadius: 6,
            zIndex: 100,
            pointerEvents: 'none',
            letterSpacing: 0.5,
          }}
        >
          FPS: {fps || '—'}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            padding: '8px 14px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#BDBDBD',
            fontSize: 12,
            fontFamily: "'Noto Sans SC', sans-serif",
            borderRadius: 6,
            zIndex: 100,
            pointerEvents: 'none',
            lineHeight: 1.6,
          }}
        >
          <div>旋转: 左键拖拽</div>
          <div>缩放: 滚轮</div>
          <div>平移: 右键拖拽 / WASD</div>
          <div>标记: 左键点击建筑表面</div>
        </div>
      </div>
    </div>
  );
}
