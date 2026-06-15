import { useEffect, useRef, useState } from 'react';
import { SceneManager } from './SceneManager';
import { ApiClient } from './ApiClient';
import type { PlanetDetail, PlanetSummary } from './ApiClient';
import { UIPanel } from './UIPanel';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetDetail | null>(null);
  const [planets, setPlanets] = useState<PlanetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const sceneManager = new SceneManager(containerRef.current);
    sceneManagerRef.current = sceneManager;

    sceneManager.onBodyClick = async (bodyId: string) => {
      try {
        const detail = await ApiClient.getPlanetById(bodyId);
        setSelectedPlanet(detail);
      } catch (error) {
        console.error('Failed to fetch planet details:', error);
      }
    };

    const loadPlanets = async () => {
      try {
        const data = await ApiClient.getAllPlanets();
        setPlanets(data);
        setLoading(false);

        for (const planet of data) {
          sceneManager.addPlanet(planet);
        }
      } catch (error) {
        console.error('Failed to load planets:', error);
        setLoading(false);
      }
    };

    loadPlanets();

    return () => {
      sceneManager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  const handleClosePanel = () => {
    setSelectedPlanet(null);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.clearSelection();
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            fontSize: '18px',
          }}
        >
          加载中...
        </div>
      )}

      <UIPanel planet={selectedPlanet} onClose={handleClosePanel} />

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: '#fff',
          zIndex: 100,
        }}
      >
        <h1 style={{ fontSize: '20px', margin: 0, marginBottom: '4px' }}>
          OrbitView
        </h1>
        <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
          3D 太阳系天体游览 | 拖拽旋转 · 滚轮缩放 · 点击查看
        </p>
      </div>
    </div>
  );
}
