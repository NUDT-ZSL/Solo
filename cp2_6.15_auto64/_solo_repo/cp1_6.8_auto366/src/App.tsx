import { useRef, useCallback } from 'react';
import CalligraphyCanvas from '@/CalligraphyCanvas';
import ControlPanel from '@/ControlPanel';
import { compositeForExport, exportToPNG } from '@/utils/calligraphyEngine';

export default function App() {
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleTextureReady = useCallback((canvas: HTMLCanvasElement) => {
    textureCanvasRef.current = canvas;
  }, []);

  const handleInkCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    inkCanvasRef.current = canvas;
  }, []);

  const handleClear = useCallback(() => {
    if (!inkCanvasRef.current) return;
    const ctx = inkCanvasRef.current.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, inkCanvasRef.current.width, inkCanvasRef.current.height);
  }, []);

  const handleExport = useCallback(() => {
    if (!textureCanvasRef.current || !inkCanvasRef.current) return;
    const composite = compositeForExport(
      textureCanvasRef.current,
      inkCanvasRef.current,
      textureCanvasRef.current.width,
      textureCanvasRef.current.height
    );
    exportToPNG(composite);
  }, []);

  return (
    <div className="app-container">
      <CalligraphyCanvas
        onTextureReady={handleTextureReady}
        onInkCanvasReady={handleInkCanvasReady}
      />
      <ControlPanel onClear={handleClear} onExport={handleExport} />
    </div>
  );
}
