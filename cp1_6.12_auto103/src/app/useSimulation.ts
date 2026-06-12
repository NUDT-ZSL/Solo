import { useEffect, useRef, useCallback } from 'react';
import { SimulationEngine, EnergyRippleData, SimulationParams } from '../core/SimulationEngine';
import { useSimulationStore, Resolution } from './store';

export function useSimulation() {
  const engineRef = useRef<SimulationEngine | null>(null);
  const heightMapRef = useRef<Float32Array | null>(null);
  const rippleDataRef = useRef<EnergyRippleData[]>([]);
  const fpsUpdateTimerRef = useRef<number | null>(null);

  const {
    waveSpeed,
    damping,
    resolution,
    setFps,
    setResolution
  } = useSimulationStore();

  const initEngine = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.dispose();
    }

    const engine = new SimulationEngine({
      resolution,
      waveSpeed,
      damping
    });

    engine.setFrameCallback((heightMap, res, ripples) => {
      heightMapRef.current = heightMap;
      rippleDataRef.current = ripples;
    });

    engine.start();
    engineRef.current = engine;

    fpsUpdateTimerRef.current = window.setInterval(() => {
      if (engineRef.current) {
        const currentFps = engineRef.current.getFps();
        setFps(currentFps);

        if (currentFps < 55) {
          const storeResolution = useSimulationStore.getState().resolution;
          if (storeResolution === 128) {
            useSimulationStore.getState().setResolution(64);
          } else if (storeResolution === 64) {
            useSimulationStore.getState().setResolution(32);
          }
        }
      }
    }, 2000);
  }, [resolution, waveSpeed, damping, setFps, setResolution]);

  useEffect(() => {
    initEngine();
    return () => {
      if (fpsUpdateTimerRef.current) {
        clearInterval(fpsUpdateTimerRef.current);
      }
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [initEngine]);

  useEffect(() => {
    if (engineRef.current) {
      const params: Partial<SimulationParams> = {
        waveSpeed,
        damping,
        resolution
      };
      engineRef.current.setParams(params);
    }
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
    reset,
    getFps: () => engineRef.current?.getFps() ?? 0
  };
}
