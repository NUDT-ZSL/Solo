import { useEffect, useRef, useCallback } from 'react';
import { SimulationEngine, EnergyRippleData, SimulationParams } from '../core/SimulationEngine';
import { useSimulationStore, Resolution } from './store';

const RESOLUTION_LADDER: Resolution[] = [128, 64, 32];

export function useSimulation() {
  const engineRef = useRef<SimulationEngine | null>(null);
  const heightMapRef = useRef<Float32Array | null>(null);
  const rippleDataRef = useRef<EnergyRippleData[]>([]);
  const fpsTimerRef = useRef<number | null>(null);
  const lowFpsCountRef = useRef(0);
  const initDoneRef = useRef(false);

  const {
    waveSpeed,
    damping,
    resolution,
    setFps,
    setResolution
  } = useSimulationStore();

  useEffect(() => {
    const engine = new SimulationEngine({
      resolution: 64,
      waveSpeed: 1.5,
      damping: 0.05
    });

    engine.setFrameCallback((heightMap, _res, ripples) => {
      heightMapRef.current = heightMap;
      rippleDataRef.current = ripples;
    });

    engine.start();
    engineRef.current = engine;
    initDoneRef.current = true;

    fpsTimerRef.current = window.setInterval(() => {
      if (!engineRef.current) return;
      const currentFps = engineRef.current.getFps();
      setFps(currentFps);

      if (currentFps < 55) {
        lowFpsCountRef.current++;
        if (lowFpsCountRef.current >= 2) {
          const currentRes = useSimulationStore.getState().resolution;
          const currentIdx = RESOLUTION_LADDER.indexOf(currentRes);
          if (currentIdx < RESOLUTION_LADDER.length - 1) {
            const nextRes = RESOLUTION_LADDER[currentIdx + 1];
            useSimulationStore.getState().setResolution(nextRes);
          }
          lowFpsCountRef.current = 0;
        }
      } else {
        lowFpsCountRef.current = 0;
      }
    }, 1000);

    return () => {
      if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
      engine.dispose();
      engineRef.current = null;
      initDoneRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initDoneRef.current || !engineRef.current) return;
    engineRef.current.setParams({ waveSpeed, damping, resolution });
  }, [waveSpeed, damping, resolution]);

  const addWaveSource = useCallback((x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.addWaveSource(x, y);
    }
  }, []);

  const addEnergyRipple = useCallback((x?: number, y?: number) => {
    if (engineRef.current) {
      engineRef.current.addEnergyRipple(x, y);
    }
  }, []);

  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
  }, []);

  return {
    heightMapRef,
    rippleDataRef,
    addWaveSource,
    addEnergyRipple,
    reset
  };
}
