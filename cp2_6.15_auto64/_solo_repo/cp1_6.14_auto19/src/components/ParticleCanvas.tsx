import React, { useRef, useEffect, useCallback } from 'react';
import { ParticleEngine, ParticleConfig, DEFAULT_CONFIG } from '../utils/particleEngine';

interface ParticleCanvasProps {
  config: ParticleConfig;
  onViewChange?: (zoom: number, count: number) => void;
  engineRef?: React.MutableRefObject<ParticleEngine | null>;
  onFpsUpdate?: (fps: number) => void;
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  config,
  onViewChange,
  engineRef,
  onFpsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineInstanceRef = useRef<ParticleEngine | null>(null);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const zoomRef = useRef(5);
  const targetZoomRef = useRef(5);
  const targetRotRef = useRef({ x: 0.3, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const initialZoom = 5;
    zoomRef.current = initialZoom;
    targetZoomRef.current = initialZoom;

    const engine = new ParticleEngine(
      containerRef.current,
      DEFAULT_CONFIG,
      onFpsUpdate
    );
    engineInstanceRef.current = engine;
    if (engineRef) engineRef.current = engine;
    engine.start();

    const cam = engine.getCamera();
    cam.position.set(0, 0, initialZoom);
    cam.lookAt(0, 0, 0);

    return () => {
      engine.dispose();
      engineInstanceRef.current = null;
      if (engineRef) engineRef.current = null;
    };
  }, [onFpsUpdate, engineRef]);

  useEffect(() => {
    if (engineInstanceRef.current) {
      engineInstanceRef.current.updateConfig(config);
    }
  }, [config]);

  useEffect(() => {
    let raf: number;
    const damp = 0.1;
    const tick = () => {
      const engine = engineInstanceRef.current;
      if (engine) {
        const dz = (targetZoomRef.current - zoomRef.current) * damp;
        if (Math.abs(dz) > 0.001) {
          zoomRef.current += dz;
          const camera = engine.getCamera();
          const dir = camera.position.clone().normalize();
          camera.position.copy(dir.multiplyScalar(zoomRef.current));
          camera.lookAt(0, 0, 0);
          onViewChange?.(zoomRef.current / 5.0, config.count);
        }
        const dRx = (targetRotRef.current.x - rotationRef.current.x) * damp;
        const dRy = (targetRotRef.current.y - rotationRef.current.y) * damp;
        if (Math.abs(dRx) > 0.0001 || Math.abs(dRy) > 0.0001) {
          rotationRef.current.x += dRx;
          rotationRef.current.y += dRy;
          const camera = engine.getCamera();
          camera.position.x = zoomRef.current * Math.cos(rotationRef.current.x) * Math.sin(rotationRef.current.y);
          camera.position.y = zoomRef.current * Math.sin(rotationRef.current.x);
          camera.position.z = zoomRef.current * Math.cos(rotationRef.current.x) * Math.cos(rotationRef.current.y);
          camera.lookAt(0, 0, 0);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config.count, onViewChange]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.1 : -0.1;
      targetZoomRef.current = Math.max(0.5 * 5, Math.min(5 * 5, targetZoomRef.current + delta * targetZoomRef.current * 0.5));
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;

    const dx = e.clientX - prevMouse.current.x;
    const dy = e.clientY - prevMouse.current.y;

    targetRotRef.current.y += dx * 0.005;
    targetRotRef.current.x += dy * 0.005;
    targetRotRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotRef.current.x));

    prevMouse.current = { x: e.clientX, y: e.clientY };
    onViewChange?.(targetZoomRef.current / 5.0, config.count);
  }, [config.count, onViewChange]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
};

export default ParticleCanvas;
