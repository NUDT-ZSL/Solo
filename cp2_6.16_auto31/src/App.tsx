import { useEffect } from 'react';
import { Scene } from './renderer/scene';
import { ToolPanel } from './ui/panel';
import { InfoCard } from './ui/card';
import { PerformanceIndicator } from './ui/indicator';
import { ContextMenu } from './ui/contextMenu';
import { useAppStore } from './data/store';
import { useFPSCounter } from './controls/interaction';
import './index.css';

function FPSUpdater() {
  useFPSCounter();
  return null;
}

function App() {
  const rightClickMenu = useAppStore((s) => s.rightClickMenu);
  const setRightClickMenu = useAppStore((s) => s.setRightClickMenu);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const menu = useAppStore.getState().rightClickMenu;
        if (menu.visible) {
          setRightClickMenu({ ...menu, visible: false });
        }
        const showInfoCard = useAppStore.getState().showInfoCard;
        if (showInfoCard) {
          useAppStore.getState().setShowInfoCard(false);
          useAppStore.getState().setSelectedArtifact(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setRightClickMenu]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #0d47a1, #000000)',
        position: 'relative',
      }}
    >
      <Scene />
      <FPSUpdater />
      <ToolPanel />
      <InfoCard />
      <PerformanceIndicator />
      <ContextMenu />

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          color: 'rgba(129, 212, 250, 0.6)',
          pointerEvents: 'none',
          zIndex: 50,
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        海底沉船考古 · 探索发现更多秘密
      </div>
    </div>
  );
}

export default App;
