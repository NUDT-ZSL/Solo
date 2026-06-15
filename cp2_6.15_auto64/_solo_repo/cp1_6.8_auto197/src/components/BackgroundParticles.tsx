import { useEffect, useRef } from 'react';
import { BackgroundParticleEngine } from '@/utils/particleEngine';

export default function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BackgroundParticleEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = new BackgroundParticleEngine(canvasRef.current);
    engineRef.current.start();
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
