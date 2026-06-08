import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createScene, renderFrame, resetCamera, SceneContext } from './scene';
import {
  createParticleSystem,
  updateParticleSystem,
  rebuildParticles,
  rebuildConnections,
  ParticleSystem,
  ParticleSettings,
} from './particles';
import {
  createInteractionState,
  setupInteraction,
  InteractionState,
} from './interaction';
import { ControlPanel } from './ui';

const DEFAULT_SETTINGS: ParticleSettings = {
  count: 80,
  connectionDensity: 5,
  waveAmplitude: 1.0,
  animationSpeed: 1.0,
};

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  const systemRef = useRef<ParticleSystem | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const rafRef = useRef<number>(0);
  const [settings, setSettings] = useState<ParticleSettings>(DEFAULT_SETTINGS);
  const prevCountRef = useRef(DEFAULT_SETTINGS.count);
  const prevDensityRef = useRef(DEFAULT_SETTINGS.connectionDensity);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = createScene(containerRef.current);
    ctxRef.current = ctx;

    const system = createParticleSystem(ctx, DEFAULT_SETTINGS);
    systemRef.current = system;

    const interaction = createInteractionState();
    interactionRef.current = interaction;
    setupInteraction(ctx, system, interaction);

    const animate = () => {
      const delta = ctx.clock.getDelta();
      updateParticleSystem(ctx, system, delta);
      renderFrame(ctx);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.renderer.dispose();
      ctx.renderer.domElement.remove();
    };
  }, []);

  const handleSettingsChange = useCallback((newSettings: ParticleSettings) => {
    setSettings(newSettings);
    const ctx = ctxRef.current;
    const system = systemRef.current;
    if (!ctx || !system) return;

    if (newSettings.count !== prevCountRef.current) {
      prevCountRef.current = newSettings.count;
      rebuildParticles(ctx, system, newSettings.count);
    }

    if (newSettings.connectionDensity !== prevDensityRef.current) {
      prevDensityRef.current = newSettings.connectionDensity;
      rebuildConnections(ctx, system, newSettings.connectionDensity);
    }

    system.settings.waveAmplitude = newSettings.waveAmplitude;
    system.settings.animationSpeed = newSettings.animationSpeed;
  }, []);

  const handleResetCamera = useCallback(() => {
    if (ctxRef.current) {
      resetCamera(ctxRef.current);
    }
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          animation: 'fadeIn 1.5s ease forwards',
        }}
      />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(100, 160, 255, 0.8);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(80, 140, 255, 0.5);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.3);
          box-shadow: 0 0 14px rgba(80, 140, 255, 0.8);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(100, 160, 255, 0.8);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(80, 140, 255, 0.5);
        }
      `}</style>
      <ControlPanel
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onResetCamera={handleResetCamera}
      />
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
