import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AuroraEngine } from './AuroraEngine';
import { InteractionManager, AuroraInfoData } from './InteractionManager';
import { AuroraParams } from './AuroraPhysics';
import { UIOverlay } from './UIOverlay';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AuroraEngine | null>(null);
  const interactionRef = useRef<InteractionManager | null>(null);
  const [auroraInfo, setAuroraInfo] = useState<AuroraInfoData | null>(null);
  const infoTimerRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new AuroraEngine(containerRef.current);
    engineRef.current = engine;

    const interaction = new InteractionManager(engine);
    interactionRef.current = interaction;

    interaction.onBurst((data: AuroraInfoData) => {
      setAuroraInfo(data);
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
      infoTimerRef.current = window.setTimeout(() => {
        setAuroraInfo(null);
      }, 4000);
    });

    engine.start();

    return () => {
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
      interaction.dispose();
      engine.dispose();
      engineRef.current = null;
      interactionRef.current = null;
    };
  }, []);

  const handleParamsChange = useCallback((params: Partial<AuroraParams>) => {
    engineRef.current?.updateParams(params);
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.resetScene();
    interactionRef.current?.resetView();
    setAuroraInfo(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <UIOverlay onParamsChange={handleParamsChange} onReset={handleReset} auroraInfo={auroraInfo} />
    </div>
  );
};

export default App;
