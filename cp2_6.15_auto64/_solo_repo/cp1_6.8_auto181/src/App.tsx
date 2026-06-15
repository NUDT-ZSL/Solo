import { useEffect, useRef } from 'react';
import { CoreEngine, useAppStore } from './CoreEngine';
import UILayer from './UILayer';

const engine = new CoreEngine();

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaded = useAppStore(s => s.loaded);
  const setLoaded = useAppStore(s => s.setLoaded);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engine.init(canvas).then(() => {
      setLoaded(true);
      engine.startIdleRender();
    });

    return () => {
      engine.destroy();
    };
  }, [setLoaded]);

  return (
    <div className={`app-root ${loaded ? 'app-loaded' : ''}`}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ cursor: 'grab' }}
      />
      <UILayer engine={engine} />
    </div>
  );
}
