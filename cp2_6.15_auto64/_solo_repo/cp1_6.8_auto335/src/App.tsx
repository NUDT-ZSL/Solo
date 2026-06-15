import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import AuroraScene from './AuroraScene';
import ControlPanel from './ControlPanel';
import { AudioAnalyzer } from './AudioAnalyzer';
import { ThemeKey } from './utils/particleSystem';

const App: React.FC = () => {
  const [micOn, setMicOn] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>('aurora');
  const [density, setDensity] = useState(1200);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);

  const handleMicToggle = useCallback(async () => {
    if (micOn) {
      audioAnalyzerRef.current?.stop();
      audioAnalyzerRef.current = null;
      setMicOn(false);
    } else {
      const analyzer = new AudioAnalyzer();
      const success = await analyzer.start();
      if (success) {
        audioAnalyzerRef.current = analyzer;
        setMicOn(true);
      }
    }
  }, [micOn]);

  const handleRipple = useCallback((origin: THREE.Vector3) => {
    console.log('Ripple at', origin.x.toFixed(2), origin.y.toFixed(2), origin.z.toFixed(2));
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      <AuroraScene
        theme={theme}
        density={density}
        audioAnalyzer={audioAnalyzerRef.current}
        onRippleRequest={handleRipple}
      />
      <ControlPanel
        micOn={micOn}
        onMicToggle={handleMicToggle}
        theme={theme}
        onThemeChange={setTheme}
        density={density}
        onDensityChange={setDensity}
      />
    </div>
  );
};

export default App;
