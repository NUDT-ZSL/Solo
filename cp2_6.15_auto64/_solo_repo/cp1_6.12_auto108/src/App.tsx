import { useState, useEffect, useCallback } from 'react';
import SceneManager from './components/SceneManager';
import ControlPanel from './components/ControlPanel';
import { fetchLayout } from './utils/DataLoader';
import type { LightFixture, LayoutData, LightingResult, TimePreset } from './types';

export default function App() {
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [layoutId, setLayoutId] = useState('living_40');
  const [availableLayouts, setAvailableLayouts] = useState<Array<{ id: string; name: string }>>([
    { id: 'studio_30', name: '一居室 30㎡' },
    { id: 'living_40', name: '客厅 40㎡' },
    { id: 'loft_50', name: '开放式Loft 50㎡' }
  ]);
  const [lights, setLights] = useState<LightFixture[]>([]);
  const [timePreset, setTimePreset] = useState<TimePreset>('afternoon_3');
  const [lightingResult, setLightingResult] = useState<LightingResult | null>(null);
  const [draggingLightType, setDraggingLightType] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchLayout(layoutId).then(data => {
      if (mounted) {
        setLayout(data);
        setAvailableLayouts([
          { id: 'studio_30', name: '一居室 30㎡' },
          { id: 'living_40', name: '客厅 40㎡' },
          { id: 'loft_50', name: '开放式Loft 50㎡' }
        ]);
        setLights(data.default_lights || []);
      }
    }).catch(err => {
      console.error('Failed to load layout:', err);
    });
    return () => { mounted = false; };
  }, [layoutId]);

  const handleLayoutChange = useCallback((id: string) => {
    setLayoutId(id);
  }, []);

  const handleLightingResult = useCallback((result: LightingResult) => {
    setLightingResult(result);
  }, []);

  if (!layout) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>加载场景中...</p>
      </div>
    );
  }

  return (
    <div className={`app-container ${isMobile ? 'mobile' : 'desktop'}`}>
      <div className="scene-wrapper">
        <SceneManager
          layout={layout}
          lights={lights}
          onLightsChange={setLights}
          timePreset={timePreset}
          onLightingResult={handleLightingResult}
          draggingLightType={draggingLightType}
          onDraggingLightTypeChange={setDraggingLightType}
        />
      </div>
      <ControlPanel
        layoutId={layoutId}
        availableLayouts={availableLayouts}
        onLayoutChange={handleLayoutChange}
        lights={lights}
        onLightsChange={setLights}
        timePreset={timePreset}
        onTimePresetChange={setTimePreset}
        lightingResult={lightingResult}
        onDragLightType={setDraggingLightType}
        isCollapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(prev => !prev)}
      />
    </div>
  );
}
