import React, { useState, useEffect, useCallback } from 'react';
import type { DensityParams, Particle } from './particleEngine';
import { getDefaultParams } from './particleEngine';
import { loadFromLocalStorage } from './dataService';
import Controls from './controls';
import { SceneCanvas, FPSCounter, ParticleInfoCard } from './scene';

const App: React.FC = () => {
  const [params, setParams] = useState<DensityParams>(() => {
    return loadFromLocalStorage() || getDefaultParams();
  });
  const [opacity, setOpacity] = useState(1);
  const [clickedParticle, setClickedParticle] = useState<Particle | null>(null);
  const [hoveredParticle, setHoveredParticle] = useState<Particle | null>(null);

  const handleParamsChange = useCallback((newParams: DensityParams) => {
    setParams(newParams);
  }, []);

  const handlePresetSwitch = useCallback((newParams: DensityParams) => {
    setParams(newParams);
  }, []);

  const handleOpacityChange = useCallback((newOpacity: number) => {
    setOpacity(newOpacity);
  }, []);

  const handleParticleClick = useCallback((particle: Particle | null) => {
    setClickedParticle(particle);
  }, []);

  const handleHoverParticle = useCallback((particle: Particle | null) => {
    setHoveredParticle(particle);
  }, []);

  const handleCloseInfoCard = useCallback(() => {
    setClickedParticle(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <SceneCanvas
        params={params}
        opacity={opacity}
        onParticleClick={handleParticleClick}
        onHoverParticle={handleHoverParticle}
      />
      <FPSCounter />
      <Controls
        params={params}
        onParamsChange={handleParamsChange}
        onPresetSwitch={handlePresetSwitch}
        onOpacityChange={handleOpacityChange}
      />
      <ParticleInfoCard particle={clickedParticle} onClose={handleCloseInfoCard} />
    </div>
  );
};

export default App;
