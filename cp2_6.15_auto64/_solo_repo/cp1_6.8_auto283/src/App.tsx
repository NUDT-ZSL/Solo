import { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import WallpaperCanvas from './components/WallpaperCanvas';

export type PatternType = 'kaleidoscope' | 'ripple' | 'smoke';

export interface ColorScheme {
  name: string;
  colors: string[];
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { name: '极光', colors: ['#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5'] },
  { name: '熔岩', colors: ['#ff6b35', '#ff0a54', '#ff477e', '#ffbe0b'] },
  { name: '深海', colors: ['#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'] },
  { name: '星云', colors: ['#7400b8', '#6930c3', '#5390d9', '#48bfe3'] },
  { name: '森林', colors: ['#06d6a0', '#118ab2', '#073b4c', '#ffd166'] },
];

export interface WallpaperConfig {
  pattern: PatternType;
  colorScheme: ColorScheme;
  speed: number;
  density: number;
}

export default function App() {
  const [config, setConfig] = useState<WallpaperConfig>({
    pattern: 'kaleidoscope',
    colorScheme: COLOR_SCHEMES[0],
    speed: 50,
    density: 50,
  });
  const [transitioning, setTransitioning] = useState(false);
  const [prevPattern, setPrevPattern] = useState<PatternType>('kaleidoscope');

  const handlePatternChange = useCallback((pattern: PatternType) => {
    if (pattern === config.pattern) return;
    setPrevPattern(config.pattern);
    setTransitioning(true);
    setConfig((prev) => ({ ...prev, pattern }));
    setTimeout(() => setTransitioning(false), 800);
  }, [config.pattern]);

  const handleColorSchemeChange = useCallback((colorScheme: ColorScheme) => {
    setConfig((prev) => ({ ...prev, colorScheme }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setConfig((prev) => ({ ...prev, speed }));
  }, []);

  const handleDensityChange = useCallback((density: number) => {
    setConfig((prev) => ({ ...prev, density }));
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #0f0f23 100%)',
    }}>
      <WallpaperCanvas
        config={config}
        transitioning={transitioning}
        prevPattern={prevPattern}
      />
      <ControlPanel
        config={config}
        onPatternChange={handlePatternChange}
        onColorSchemeChange={handleColorSchemeChange}
        onSpeedChange={handleSpeedChange}
        onDensityChange={handleDensityChange}
      />
    </div>
  );
}
