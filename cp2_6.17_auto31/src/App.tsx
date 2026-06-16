import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { SequenceParams, KspacePoint, ProtonData, ImageData } from './types';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';
import KspaceCanvas from './components/KspaceCanvas';
import { generateProtons, computeKspace, reconstructImage, generateKspaceTrajectoryPoints } from './utils/kspaceSim';

const DEFAULT_PARAMS: SequenceParams = {
  TR: 600,
  TE: 30,
  flipAngle: 90,
};

const appContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  backgroundColor: '#1a1a2e',
  color: '#eaeaea',
  overflow: 'hidden',
};

const leftPanelStyle: React.CSSProperties = {
  width: '320px',
  minWidth: '320px',
  height: '100%',
  backgroundColor: '#16213e',
  borderRight: '1px solid #0f3460',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  overflowX: 'hidden',
  transition: 'all 0.25s ease',
};

const rightPanelStyle: React.CSSProperties = {
  flex: 1,
  height: '100%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
};

const sceneContainerStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  width: '100%',
  minHeight: 0,
};

const bottomRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  padding: '16px',
  borderTop: '1px solid #0f3460',
  backgroundColor: '#16213e',
};

const imageCardStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#16213e',
  border: '1px solid #0f3460',
  borderRadius: '8px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#eaeaea',
  alignSelf: 'flex-start',
};

const resetButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  zIndex: 10,
  padding: '8px 16px',
  backgroundColor: 'rgba(22, 33, 62, 0.9)',
  border: '1px solid #0f3460',
  borderRadius: '6px',
  color: '#eaeaea',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
};

const kspaceOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '16px',
  right: '16px',
  zIndex: 10,
  backgroundColor: 'rgba(22, 33, 62, 0.95)',
  border: '1px solid #0f3460',
  borderRadius: '8px',
  padding: '10px',
};

function App() {
  const [params, setParams] = useState<SequenceParams>(DEFAULT_PARAMS);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [reconstructedImage, setReconstructedImage] = useState<ImageData | null>(null);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const protons = useMemo<ProtonData[]>(() => generateProtons(), []);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setAnimationPhase((prev) => prev + delta * 0.001);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleParamChange = useCallback((key: keyof SequenceParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAcquire = useCallback(() => {
    setIsAcquiring(true);

    const startTime = performance.now();
    const kspace = computeKspace(protons, params);
    const image = reconstructImage(kspace, params);
    const elapsed = performance.now() - startTime;

    const delay = Math.max(0, 200 - elapsed);
    setTimeout(() => {
      setReconstructedImage(image);
      setIsAcquiring(false);
    }, delay);
  }, [protons, params]);

  const handleResetView = useCallback(() => {
    setResetKey((k) => k + 1);
  }, []);

  const trajectoryPoints = useMemo<KspacePoint[]>(
    () => generateKspaceTrajectoryPoints(animationPhase, params),
    [animationPhase, params]
  );

  return (
    <div style={appContainerStyle}>
      <div style={leftPanelStyle}>
        <ControlPanel
          params={params}
          onParamChange={handleParamChange}
          onAcquire={handleAcquire}
          isAcquiring={isAcquiring}
        />
      </div>

      <div style={rightPanelStyle}>
        <div style={sceneContainerStyle}>
          <button
            style={resetButtonStyle}
            onClick={handleResetView}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 52, 96, 0.95)';
              e.currentTarget.style.borderColor = '#4ecdc4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(22, 33, 62, 0.9)';
              e.currentTarget.style.borderColor = '#0f3460';
            }}
          >
            重置视角
          </button>

          <Scene
            protons={protons}
            params={params}
            animationPhase={animationPhase}
            resetKey={resetKey}
          />

          <div style={kspaceOverlayStyle}>
            <div style={{ ...cardTitleStyle, marginBottom: '6px' }}>k空间轨迹</div>
            <KspaceCanvas
              width={320}
              height={240}
              points={trajectoryPoints}
              imageData={null}
            />
          </div>
        </div>

        <div style={bottomRowStyle}>
          <div style={imageCardStyle}>
            <span style={cardTitleStyle}>重建图像</span>
            <KspaceCanvas
              width={320}
              height={320}
              points={[]}
              imageData={reconstructedImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
