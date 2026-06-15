import React, { useState, useRef, useCallback, useEffect } from 'react';
import ParameterPanel from './ParameterPanel';
import CanvasGrid from './CanvasGrid';
import ExportModal from './ExportModal';
import { ArtParameters, DEFAULT_PARAMETERS, PatternMode } from './types';
import './styles.css';

const App: React.FC = () => {
  const [params, setParams] = useState<ArtParameters>(DEFAULT_PARAMETERS);
  const [exportOpen, setExportOpen] = useState(false);
  const [fading, setFading] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [prevMode, setPrevMode] = useState<PatternMode>(DEFAULT_PARAMETERS.mode);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animatingRef = useRef(false);
  const animationTargetRef = useRef<Partial<ArtParameters> | null>(null);

  const handleParamChange = useCallback((changes: Partial<ArtParameters>) => {
    if (changes.mode && changes.mode !== prevMode) {
      setPrevMode(changes.mode);
      setFading(true);
      setTimeout(() => {
        setParams((prev) => ({ ...prev, ...changes }));
        setFading(false);
      }, 250);
    } else {
      setParams((prev) => ({ ...prev, ...changes }));
    }
  }, [prevMode]);

  const animateToParams = useCallback((targetParams: Partial<ArtParameters>, duration: number = 300) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    animationTargetRef.current = targetParams;

    const startParams = { ...params };
    const startTime = performance.now();
    const keys = Object.keys(targetParams) as (keyof ArtParameters)[];

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const newParams: Partial<ArtParameters> = {};
      keys.forEach((key) => {
        const startVal = startParams[key];
        const targetVal = targetParams[key];
        if (typeof startVal === 'number' && typeof targetVal === 'number') {
          (newParams as any)[key] = startVal + (targetVal - startVal) * eased;
        } else if (progress >= 1) {
          (newParams as any)[key] = targetVal;
        }
      });

      setParams((prev) => ({ ...prev, ...newParams }));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animatingRef.current = false;
        animationTargetRef.current = null;
      }
    };

    requestAnimationFrame(animate);
  }, [params]);

  const handleRandomize = useCallback(() => {
    const modes: PatternMode[] = ['wave', 'spiral', 'fractal'];
    const randomParams: Partial<ArtParameters> = {
      amplitude: Math.round(Math.random() * 100),
      frequency: Math.round((0.1 + Math.random() * 4.9) * 10) / 10,
      phase: Math.round(Math.random() * 360),
      rotation: Math.round(Math.random() * 360),
      scale: Math.round((0.5 + Math.random() * 1.5) * 10) / 10,
      opacity: Math.round(Math.random() * 20) / 20,
      mode: modes[Math.floor(Math.random() * modes.length)],
      randomRotation: Math.random() > 0.5,
    };

    const randomColor = () => {
      const hue = Math.floor(Math.random() * 360);
      const sat = 0.3 + Math.random() * 0.4;
      const light = 0.4 + Math.random() * 0.3;
      const c = (1 - Math.abs(2 * light - 1)) * sat;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = light - c / 2;
      let r = 0, g = 0, b = 0;
      if (hue < 60) { r = c; g = x; }
      else if (hue < 120) { r = x; g = c; }
      else if (hue < 180) { g = c; b = x; }
      else if (hue < 240) { g = x; b = c; }
      else if (hue < 300) { r = x; b = c; }
      else { r = c; b = x; }
      const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    };

    randomParams.fillColor = randomColor();
    randomParams.strokeColor = randomColor();

    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);

    animateToParams(randomParams, 300);
  }, [animateToParams]);

  const handleExport = useCallback(() => {
    setExportOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && exportOpen) {
        setExportOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExport();
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        handleRandomize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exportOpen, handleExport, handleRandomize]);

  return (
    <div className="app-container">
      <ParameterPanel
        params={params}
        onChange={handleParamChange}
        onRandomize={handleRandomize}
        onExport={handleExport}
      />
      <CanvasGrid
        params={params}
        fading={fading}
        showRipple={showRipple}
        svgRef={svgRef}
      />
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        svgElement={svgRef.current}
      />
    </div>
  );
};

export default App;
