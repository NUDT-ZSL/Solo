import React, { useRef, useEffect, useCallback } from 'react';
import { ParticleEngine, ParticleConfig, DEFAULT_CONFIG } from '../utils/particleEngine';

interface ParticleCanvasProps {
  config: ParticleConfig;
  onViewChange?: (zoom: number, count: number) => void;
  engineRef?: React.MutableRefObject<ParticleEngine | null>;
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ config, onViewChange, engineRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineInstanceRef = useRef<ParticleEngine | null>(null);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const zoomRef = useRef(5);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ParticleEngine(containerRef.current, DEFAULT_CONFIG);
    engineInstanceRef.current = engine;
    if (engineRef) engineRef.current = engine;
    engine.start();

    return () => {
      engine.dispose();
      engineInstanceRef.current = null;
      if (engineRef) engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineInstanceRef.current) {
      engineInstanceRef.current.updateConfig(config);
    }
  }, [config]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.1 : -0.1;
      zoomRef.current = Math.max(0.5, Math.min(5, zoomRef.current + delta * zoomRef.current * 0.1));

      if (engineInstanceRef.current) {
        const camera = engineInstanceRef.current.getCamera();
        const dir = camera.position.clone().normalize();
        camera.position.copy(dir.multiplyScalar(zoomRef.current));
        camera.lookAt(0, 0, 0);
      }

      onViewChange?.(zoomRef.current, config.count);
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
  }, [config.count, onViewChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !engineInstanceRef.current) return;

    const dx = e.clientX - prevMouse.current.x;
    const dy = e.clientY - prevMouse.current.y;

    rotationRef.current.y += dx * 0.005;
    rotationRef.current.x += dy * 0.005;
    rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));

    const camera = engineInstanceRef.current.getCamera();
    const phi = rotationRef.current.x;
    const theta = rotationRef.current.y;

    camera.position.x = zoomRef.current * Math.cos(phi) * Math.sin(theta);
    camera.position.y = zoomRef.current * Math.sin(phi);
    camera.position.z = zoomRef.current * Math.cos(phi) * Math.cos(theta);
    camera.lookAt(0, 0, 0);

    prevMouse.current = { x: e.clientX, y: e.clientY };
    onViewChange?.(zoomRef.current, config.count);
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
