import { useState, useCallback } from 'react';
import StarMap from './components/StarMap';
import ControlPanel from './components/ControlPanel';
import { generateStars, type StarData } from './utils/starGenerator';

const DEFAULT_STAR_COUNT = 300;
const DEFAULT_FLICKER_SPEED = 1.0;

export default function App() {
  const [starCount, setStarCount] = useState(DEFAULT_STAR_COUNT);
  const [flickerSpeed, setFlickerSpeed] = useState(DEFAULT_FLICKER_SPEED);
  const [stars] = useState<StarData[]>(() => generateStars(DEFAULT_STAR_COUNT));
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const handleStarClick = useCallback((star: StarData | null) => {
    setSelectedStar(star);
  }, []);

  const handleReset = useCallback(() => {
    setResetKey((k) => k + 1);
    setSelectedStar(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <StarMap
        key={resetKey}
        stars={stars}
        starCount={starCount}
        flickerSpeed={flickerSpeed}
        onStarClick={handleStarClick}
      />
      <ControlPanel
        starCount={starCount}
        flickerSpeed={flickerSpeed}
        onStarCountChange={setStarCount}
        onFlickerSpeedChange={setFlickerSpeed}
        onReset={handleReset}
      />
      {selectedStar && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 10, 30, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(100, 140, 255, 0.3)',
            borderRadius: 8,
            padding: '16px 24px',
            color: '#c8d8ff',
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.8,
            pointerEvents: 'none',
            boxShadow: '0 0 20px rgba(80, 120, 255, 0.15)',
            maxWidth: 320,
          }}
        >
          <div style={{ fontSize: 15, color: '#ffe87a', marginBottom: 6 }}>
            ★ {selectedStar.name}
          </div>
          <div>距离: {selectedStar.distance} 光年</div>
          <div>亮度: {selectedStar.brightness.toFixed(2)}</div>
          <div>色温: {selectedStar.colorTemp}K</div>
          <div>坐标: ({selectedStar.x.toFixed(1)}, {selectedStar.y.toFixed(1)})</div>
        </div>
      )}
    </div>
  );
}
