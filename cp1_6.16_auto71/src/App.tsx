import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SceneRenderer } from './SceneRenderer';
import { RootSimulator, PlantType, SimData } from './RootSimulator';

const plantLabels: Record<PlantType, string> = {
  wheat: '小麦',
  corn: '玉米',
  sunflower: '向日葵',
};

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const simulatorRef = useRef<RootSimulator | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);

  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [simData, setSimData] = useState<SimData>({
    elapsedTime: 0,
    mainRootLength: 0,
    lateralRootCount: 0,
    nutrientPercent: 0,
    waterPercent: 0,
    stopped: true,
  });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new SceneRenderer(containerRef.current);
    const simulator = new RootSimulator(renderer);
    const clock = new THREE.Clock();

    rendererRef.current = renderer;
    simulatorRef.current = simulator;
    clockRef.current = clock;

    let lastDataUpdate = 0;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      simulator.update(delta);
      renderer.render(elapsed, delta);

      if (elapsed - lastDataUpdate > 0.05) {
        lastDataUpdate = elapsed;
        setSimData(simulator.getData());
      }
    };

    animate();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (simulator.isRunning()) {
          if (simulator.isPaused()) {
            simulator.resumeTick();
            setPaused(false);
          } else {
            simulator.pauseTick();
            setPaused(true);
          }
        }
      } else if (e.code === 'KeyC') {
        simulator.reset();
        setSelectedPlant(null);
        setPaused(false);
        setSimData({
          elapsedTime: 0,
          mainRootLength: 0,
          lateralRootCount: 0,
          nutrientPercent: 0,
          waterPercent: 0,
          stopped: true,
        });
      } else if (e.code === 'KeyX') {
        renderer.toggleProfile();
      } else if (e.code === 'KeyR') {
        renderer.resetCamera();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
    };
  }, []);

  const handlePlantSelect = (type: PlantType) => {
    setSelectedPlant(type);
    setPaused(false);
    simulatorRef.current?.startTick(type);
  };

  return (
    <div style={styles.wrapper}>
      <div ref={containerRef} style={styles.canvas} />

      <div style={styles.title}>根系生长模拟器</div>

      <div style={styles.controlPanel}>
        <div style={styles.panelTitle}>植物类型</div>
        {(['wheat', 'corn', 'sunflower'] as PlantType[]).map((type) => (
          <button
            key={type}
            onClick={() => handlePlantSelect(type)}
            style={{
              ...styles.plantButton,
              ...(selectedPlant === type ? styles.plantButtonActive : {}),
            }}
          >
            {plantLabels[type]}
          </button>
        ))}

        <div style={styles.hintTitle}>操作提示</div>
        <div style={styles.hintItem}>鼠标拖拽：旋转视角</div>
        <div style={styles.hintItem}>滚轮：缩放</div>
        <div style={styles.hintItem}>X 键：剖面视图</div>
        <div style={styles.hintItem}>R 键：重置视角</div>
        <div style={styles.hintItem}>空格：暂停/继续</div>
        <div style={styles.hintItem}>C 键：重置场景</div>
      </div>

      <div style={styles.dataPanel}>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>生长时间</span>
          <span style={styles.dataValue}>{simData.elapsedTime.toFixed(1)} s</span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>主根长度</span>
          <span style={styles.dataValue}>{simData.mainRootLength.toFixed(3)} u</span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>侧根数量</span>
          <span style={styles.dataValue}>{simData.lateralRootCount}</span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>养分吸收</span>
          <span style={{ ...styles.dataValue, color: '#FFD700' }}>
            {simData.nutrientPercent.toFixed(1)}%
          </span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>水分吸收</span>
          <span style={{ ...styles.dataValue, color: '#00BFFF' }}>
            {simData.waterPercent.toFixed(1)}%
          </span>
        </div>
        {paused && (
          <div style={{ ...styles.dataRow, marginTop: 6, justifyContent: 'center' }}>
            <span style={{ color: '#E67E22', fontWeight: 'bold' }}>[ 已暂停 ]</span>
          </div>
        )}
        {simData.stopped && simData.elapsedTime > 0 && (
          <div style={{ ...styles.dataRow, marginTop: 6, justifyContent: 'center' }}>
            <span style={{ color: '#95A5A6', fontSize: 10 }}>生长完成</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    fontFamily:
      'Menlo, Consolas, "Courier New", Courier, monospace',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  title: {
    position: 'absolute',
    top: 20,
    left: 20,
    fontSize: 16,
    fontWeight: 600,
    color: '#FFFFFF',
    textShadow: '2px 2px 4px rgba(0,0,0,0.6)',
    zIndex: 10,
    userSelect: 'none',
  },
  controlPanel: {
    position: 'absolute',
    top: 80,
    left: 20,
    width: 200,
    padding: 16,
    backgroundColor: 'rgba(44, 62, 80, 0.7)',
    borderRadius: 12,
    zIndex: 10,
    color: '#FFFFFF',
    backdropFilter: 'blur(6px)',
    userSelect: 'none',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 10,
    color: '#ECF0F1',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    paddingBottom: 6,
  },
  plantButton: {
    display: 'block',
    width: 100,
    height: 40,
    marginBottom: 8,
    border: 'none',
    borderRadius: 6,
    backgroundColor: '#34495E',
    color: '#FFFFFF',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit',
  },
  plantButtonActive: {
    backgroundColor: '#E67E22',
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginTop: 14,
    marginBottom: 6,
    color: '#BDC3C7',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    paddingTop: 10,
  },
  hintItem: {
    fontSize: 12,
    lineHeight: '20px',
    color: '#FFFFFF',
  },
  dataPanel: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    padding: 14,
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderRadius: 8,
    zIndex: 10,
    color: '#FFFFFF',
    minWidth: 160,
    userSelect: 'none',
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    lineHeight: '22px',
  },
  dataLabel: {
    color: '#BDC3C7',
    marginRight: 12,
  },
  dataValue: {
    color: '#FFFFFF',
    fontWeight: 600,
  },
};

export default App;
