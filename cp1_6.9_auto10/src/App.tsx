import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OrigamiRenderer, OrigamiParams } from './origami';
import ControlsPanel from './controls';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OrigamiRenderer | null>(null);
  const rafRef = useRef<number>(0);

  const [foldAngle, setFoldAngle] = useState<number>(30);
  const [unfoldSpeed, setUnfoldSpeed] = useState<number>(1);
  const [particleMultiplier, setParticleMultiplier] = useState<number>(1);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);

  const paramsRef = useRef<OrigamiParams>({
    foldAngle: 30,
    unfoldSpeed: 1,
    particleMultiplier: 1,
    autoPlay: false
  });

  const syncParamsToRenderer = useCallback((partial: Partial<OrigamiParams>) => {
    paramsRef.current = { ...paramsRef.current, ...partial };
    if (rendererRef.current) {
      rendererRef.current.updateParam(partial);
    }
  }, []);

  const handleFoldAngleChange = useCallback((v: number) => {
    setFoldAngle(v);
    syncParamsToRenderer({ foldAngle: v });
  }, [syncParamsToRenderer]);

  const handleUnfoldSpeedChange = useCallback((v: number) => {
    setUnfoldSpeed(v);
    syncParamsToRenderer({ unfoldSpeed: v });
  }, [syncParamsToRenderer]);

  const handleParticleMultiplierChange = useCallback((v: number) => {
    setParticleMultiplier(v);
    syncParamsToRenderer({ particleMultiplier: v });
  }, [syncParamsToRenderer]);

  const handleAutoPlayChange = useCallback((v: boolean) => {
    setAutoPlay(v);
    syncParamsToRenderer({ autoPlay: v });
  }, [syncParamsToRenderer]);

  const handleReset = useCallback(() => {
    setFoldAngle(30);
    setUnfoldSpeed(1);
    setParticleMultiplier(1);
    paramsRef.current = { ...paramsRef.current, foldAngle: 30, unfoldSpeed: 1, particleMultiplier: 1 };
    if (rendererRef.current) {
      rendererRef.current.reset();
    }
  }, []);

  const handleRandomColors = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.randomizeColors();
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new OrigamiRenderer(canvasRef.current);
    rendererRef.current = renderer;
    renderer.updateParam(paramsRef.current);

    const loop = (t: number) => {
      renderer.render(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const handleResize = () => {
      renderer.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      rendererRef.current = null;
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#1A1A2E',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      <ControlsPanel
        foldAngle={foldAngle}
        unfoldSpeed={unfoldSpeed}
        particleMultiplier={particleMultiplier}
        autoPlay={autoPlay}
        onFoldAngleChange={handleFoldAngleChange}
        onUnfoldSpeedChange={handleUnfoldSpeedChange}
        onParticleMultiplierChange={handleParticleMultiplierChange}
        onAutoPlayChange={handleAutoPlayChange}
        onReset={handleReset}
        onRandomColors={handleRandomColors}
      />
    </div>
  );
};

export default App;
