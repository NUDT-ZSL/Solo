import { useState, useEffect, useCallback } from 'react';
import { SceneModule } from './components/SceneModule';
import { UIPanel } from './components/UIPanel';
import { logicModule } from './logic/LogicModule';
import type { PlacedFurniture, LightingConfig, FurnitureTemplate, LightingPreset } from './logic/LogicModule';

function App() {
  const [furnitureList, setFurnitureList] = useState<PlacedFurniture[]>([]);
  const [lightingConfig, setLightingConfig] = useState<LightingConfig | null>(null);
  const [furnitureTemplates, setFurnitureTemplates] = useState<FurnitureTemplate[]>([]);
  const [lightingPresets, setLightingPresets] = useState<LightingPreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [furnitureRes, lightingRes] = await Promise.all([
          fetch('/api/furniture'),
          fetch('/api/lighting-presets'),
        ]);

        const furnitureData = await furnitureRes.json();
        const lightingData = await lightingRes.json();

        if (furnitureData.success) {
          logicModule.setFurnitureTemplates(furnitureData.data);
          setFurnitureTemplates(furnitureData.data);
        }

        if (lightingData.success) {
          logicModule.setLightingPresets(lightingData.data);
          setLightingPresets(lightingData.data);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = logicModule.subscribe(() => {
      setFurnitureList([...logicModule.getFurnitureList()]);
      setLightingConfig(logicModule.getCurrentLighting() ? { ...logicModule.getCurrentLighting()! } : null);
    });

    setFurnitureList([...logicModule.getFurnitureList()]);
    const lighting = logicModule.getCurrentLighting();
    setLightingConfig(lighting ? { ...lighting } : null);

    return unsubscribe;
  }, []);

  const handleLightingChange = useCallback((presetId: string) => {
    logicModule.switchLighting(presetId);
  }, []);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#ecf0f1',
        fontSize: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⏳</span>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneModule
        furnitureList={furnitureList}
        lightingConfig={lightingConfig}
        roomBounds={logicModule.getRoomBounds()}
      />
      <UIPanel
        furnitureTemplates={furnitureTemplates}
        lightingPresets={lightingPresets}
        currentLightingId={lightingConfig?.id || ''}
        onLightingChange={handleLightingChange}
      />
    </div>
  );
}

export default App;
