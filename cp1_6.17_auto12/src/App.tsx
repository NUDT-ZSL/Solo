import { useEffect, useRef, useCallback } from 'react';
import MapCanvas from './components/MapCanvas';
import PortInfo from './components/PortInfo';
import EncounterModal from './components/EncounterModal';
import SidePanel from './components/SidePanel';
import { useGameStore } from './store';
import { calculateVoyageDuration } from './GameEngine';

export default function App() {
  const {
    ship,
    gold,
    currentPort,
    selectedPort,
    destinationPort,
    voyage,
    tradeRecords,
    ports,
    cargo,
    stormMessage,
    selectPort,
    addCargo,
    removeCargo,
    startVoyage,
    updateVoyageProgress,
    resolveEncounter,
    settleVoyage,
    upgradeHull,
    upgradeCannon,
    setStormMessage,
  } = useGameStore();

  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const animateVoyage = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const store = useGameStore.getState();
    const currentVoyage = store.voyage;
    if (!currentVoyage || currentVoyage.status !== 'sailing') {
      startTimeRef.current = 0;
      return;
    }
    const distance = Math.sqrt(
      Math.pow(currentVoyage.toPort.x - currentVoyage.fromPort.x, 2) +
      Math.pow(currentVoyage.toPort.y - currentVoyage.fromPort.y, 2)
    );
    const duration = calculateVoyageDuration(distance);
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(1, elapsed / duration);

    store.updateVoyageProgress(progress);

    const updatedVoyage = useGameStore.getState().voyage;
    if (updatedVoyage && updatedVoyage.status === 'sailing' && progress < 1) {
      animFrameRef.current = requestAnimationFrame(animateVoyage);
    } else if (updatedVoyage && updatedVoyage.status === 'completed') {
      startTimeRef.current = 0;
    } else if (updatedVoyage && updatedVoyage.status === 'encounter') {
      startTimeRef.current = timestamp;
    } else {
      startTimeRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (voyage?.status === 'sailing') {
      if (!startTimeRef.current) {
        const distance = Math.sqrt(
          Math.pow(voyage.toPort.x - voyage.fromPort.x, 2) +
          Math.pow(voyage.toPort.y - voyage.fromPort.y, 2)
        );
        const duration = calculateVoyageDuration(distance);
        startTimeRef.current = performance.now() - voyage.progress * duration;
      }
      animFrameRef.current = requestAnimationFrame(animateVoyage);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [voyage?.status, animateVoyage]);

  useEffect(() => {
    if (stormMessage) {
      const timer = setTimeout(() => setStormMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [stormMessage, setStormMessage]);

  const handlePortClick = useCallback((port: typeof ports[0]) => {
    if (voyage?.status === 'sailing' || voyage?.status === 'encounter') return;
    selectPort(port);
  }, [voyage?.status, selectPort]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#0B1D3A',
      fontFamily: '"Noto Sans SC", sans-serif',
    }}>
      <div style={{
        flex: '0 0 70%',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <MapCanvas
          ports={ports}
          selectedPort={selectedPort}
          destinationPort={destinationPort}
          voyage={voyage}
          onPortClick={handlePortClick}
        />

        {selectedPort && !voyage && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}>
            <PortInfo
              port={selectedPort}
              destinationPort={destinationPort}
              cargo={cargo}
              ship={ship}
              allPorts={ports}
              onAddCargo={addCargo}
              onRemoveCargo={removeCargo}
              onStartVoyage={startVoyage}
              onClose={() => useGameStore.getState().clearSelection()}
            />
          </div>
        )}

        {stormMessage && (
          <div style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
          }}>
            <div
              className="storm-text"
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#E63946',
                fontFamily: 'Cinzel, serif',
                whiteSpace: 'nowrap',
                animation: 'stormText 0.5s infinite ease-in-out',
              }}
            >
              {stormMessage}
            </div>
          </div>
        )}

        {voyage?.status === 'completed' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            background: 'rgba(41,50,65,0.95)',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            border: '2px solid #D4A373',
            minWidth: '300px',
          }}>
            <h2 style={{ color: '#F4A261', fontFamily: 'Cinzel, serif', marginBottom: '16px', fontSize: '24px' }}>
              ⚓ 抵达目的地！
            </h2>
            <p style={{ color: '#F1FAEE', fontSize: '16px', marginBottom: '8px' }}>
              {voyage.fromPort.name} → {voyage.toPort.name}
            </p>
            <p style={{ color: '#2A9D8F', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              利润: +{useGameStore.getState().voyage?.bonusGold ? `💰` : ''} 金币
            </p>
            <button
              onClick={settleVoyage}
              style={{
                background: '#E63946',
                color: '#F1FAEE',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#FF6B6B'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#E63946'; }}
            >
              结算收益
            </button>
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'rgba(41,50,65,0.85)',
          borderRadius: '8px',
          padding: '8px 16px',
          zIndex: 5,
        }}>
          <span style={{ color: '#F1FAEE', fontSize: '14px' }}>
            📍 当前港口: <strong>{currentPort?.name ?? '无'}</strong>
          </span>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(41,50,65,0.85)',
          borderRadius: '8px',
          padding: '8px 16px',
          zIndex: 5,
        }}>
          <span style={{ color: '#F1FAEE', fontSize: '13px' }}>
            💡 点击港口选择起点，再点击另一港口设定目的地
          </span>
        </div>
      </div>

      <div style={{
        flex: '0 0 30%',
        borderLeft: '1px solid #1A3A5C',
      }}>
        <SidePanel
          ship={ship}
          gold={gold}
          tradeRecords={tradeRecords}
          onUpgradeHull={upgradeHull}
          onUpgradeCannon={upgradeCannon}
        />
      </div>

      {voyage?.status === 'encounter' && voyage.currentEvent && (
        <EncounterModal
          event={voyage.currentEvent}
          ship={ship}
          onResolve={resolveEncounter}
        />
      )}
    </div>
  );
}
