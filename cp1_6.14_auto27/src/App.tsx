import React, { useState, useEffect } from 'react';
import PreviewPanel from './components/PreviewPanel';
import GradientEditor from './components/GradientEditor';
import { createDefaultGradient, createDefaultOverlay } from './utils/gradientUtils';
import type { GradientConfig, OverlayConfig } from './utils/gradientUtils';

const App: React.FC = () => {
  const [gradientConfig, setGradientConfig] = useState<GradientConfig>(createDefaultGradient());
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(createDefaultOverlay());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#12121c',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <PreviewPanel
        gradientConfig={gradientConfig}
        overlayConfig={overlayConfig}
      />
      <GradientEditor
        gradientConfig={gradientConfig}
        overlayConfig={overlayConfig}
        onGradientChange={setGradientConfig}
        onOverlayChange={setOverlayConfig}
      />
    </div>
  );
};

export default App;
