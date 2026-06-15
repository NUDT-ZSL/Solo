import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SunEngine, FlareInfo } from './SunEngine';
import { SunRenderer } from './SunRenderer';
import { ControlPanel } from './ControlPanel';
import { InfoCard } from './InfoCard';

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SunEngine | null>(null);
  const rendererRef = useRef<SunRenderer | null>(null);
  const [, setTick] = useState(0);
  const [activeFlare, setActiveFlare] = useState<FlareInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new SunEngine();
    const renderer = new SunRenderer(containerRef.current, engine);

    engineRef.current = engine;
    rendererRef.current = renderer;

    renderer.onFlareClick = (flare: FlareInfo) => {
      setActiveFlare({ ...flare });
    };

    engine.on('flareExpired', (id: number) => {
      setActiveFlare((prev) => (prev && prev.id === id ? null : prev));
    });

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);

    renderer.init();
    renderer.start();

    return () => {
      clearInterval(interval);
      renderer.dispose();
    };
  }, []);

  const handleCloseInfoCard = useCallback(() => {
    setActiveFlare(null);
  }, []);

  const engine = engineRef.current;
  const renderer = rendererRef.current;

  return (
    <div className="app-root">
      <div ref={containerRef} className="canvas-container" />

      <div className="title-bar">
        <span className="title-text">日冕脉动</span>
        <span className="title-sub">Corona Pulse</span>
      </div>

      {engine && renderer && (
        <ControlPanel engine={engine} renderer={renderer} />
      )}

      <InfoCard flare={activeFlare} onClose={handleCloseInfoCard} />
    </div>
  );
};
