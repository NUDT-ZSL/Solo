import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import SolarScene from '@/scene/SolarScene';
import ControlPanel from '@/ui/ControlPanel';
import InfoCard from '@/ui/InfoCard';
import { PlanetData } from '@/astronomy/planetData';
import { getInitialCameraPosition, getPlanetFocusPosition } from '@/astronomy/orbitCalculator';

export default function App() {
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [focusedPlanetId, setFocusedPlanetId] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);

  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const handleSliderChange = (e: CustomEvent) => {
      setSpeedMultiplier(e.detail);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const slider = target.closest('[data-slider]');
      if (slider && e.buttons === 1) {
        const rect = slider.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const value = Math.round(1 + percentage * 9);
        setSpeedMultiplier(value);
      }
    };

    const handleMouseUp = () => {
      const sliders = document.querySelectorAll('[data-slider]');
      sliders.forEach((s) => s.classList.remove('dragging'));
    };

    window.addEventListener('sliderChange', handleSliderChange as EventListener);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('sliderChange', handleSliderChange as EventListener);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handlePlanetClick = useCallback(
    (planet: PlanetData, position: THREE.Vector3) => {
      if (isTransitioningRef.current) return;

      setFocusedPlanetId(planet.id);
      setSelectedPlanet(planet);

      const focusPos = getPlanetFocusPosition(position, planet.radius);
      setCameraTarget(focusPos);
      isTransitioningRef.current = true;
    },
    []
  );

  const handlePlanetSelect = useCallback(
    (planet: PlanetData) => {
      if (isTransitioningRef.current) return;

      setFocusedPlanetId(planet.id);
      setSelectedPlanet(planet);

      const position = new THREE.Vector3(0, 0, 0);
      if (planet.id !== 'sun') {
        const angle = Math.random() * Math.PI * 2;
        const radius = planet.orbitRadius;
        position.x = radius * Math.cos(angle);
        position.z = radius * Math.sin(angle) * 0.95;
        position.y = position.z * 0.024;
      }

      const focusPos = getPlanetFocusPosition(position, planet.radius);
      setCameraTarget(focusPos);
      isTransitioningRef.current = true;
    },
    []
  );

  const handleCameraTransitionComplete = useCallback(() => {
    isTransitioningRef.current = false;
  }, []);

  const handleResetView = useCallback(() => {
    if (isTransitioningRef.current) return;

    setFocusedPlanetId(null);
    setSelectedPlanet(null);

    const initialPos = getInitialCameraPosition();
    setCameraTarget(initialPos);
    isTransitioningRef.current = true;
  }, []);

  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleCloseInfoCard = useCallback(() => {
    setSelectedPlanet(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SolarScene
        speedMultiplier={speedMultiplier}
        isPaused={isPaused}
        focusedPlanetId={focusedPlanetId}
        onPlanetClick={handlePlanetClick}
        cameraTarget={cameraTarget}
        onCameraTransitionComplete={handleCameraTransitionComplete}
      />

      <ControlPanel
        speedMultiplier={speedMultiplier}
        onSpeedChange={setSpeedMultiplier}
        isPaused={isPaused}
        onPauseToggle={handlePauseToggle}
        onPlanetSelect={handlePlanetSelect}
        onResetView={handleResetView}
        focusedPlanetId={focusedPlanetId}
      />

      <InfoCard planet={selectedPlanet} onClose={handleCloseInfoCard} />
    </div>
  );
}
