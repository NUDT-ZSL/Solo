import React, { useState, useEffect } from 'react';
import PreviewPanel from './components/PreviewPanel';
import GradientEditor from './components/GradientEditor';
import { createDefaultGradient, createDefaultOverlay } from './utils/gradientUtils';
import type { GradientConfig, OverlayConfig } from './utils/gradientUtils';

const App: React.FC = () => {
  const [gradientConfig, setGradientConfig] = useState<GradientConfig>(createDefaultGradient());
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(createDefaultOverlay());

  return (
    <div className="app-container">
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
