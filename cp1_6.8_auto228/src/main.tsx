import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ParticleCanvas from './components/ParticleCanvas';
import InfoCard from './components/InfoCard';
import { useMouseTrail } from './hooks/useMouseTrail';
import './styles/global.css';

interface BurstData {
  id: number;
  x: number;
  y: number;
}

function App() {
  const [burst, setBurst] = useState<BurstData>({ id: 0, x: 0, y: 0 });
  const mouseTrailRef = useMouseTrail();
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    const updateCursor = () => {
      if (cursorRef.current) {
        const s = mouseTrailRef.current;
        cursorRef.current.style.left = s.x + 'px';
        cursorRef.current.style.top = s.y + 'px';
      }
      rafId = requestAnimationFrame(updateCursor);
    };
    rafId = requestAnimationFrame(updateCursor);
    return () => cancelAnimationFrame(rafId);
  }, [mouseTrailRef]);

  const handleBurst = useCallback((x: number, y: number) => {
    setBurst(prev => ({ id: prev.id + 1, x, y }));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      handleBurst(e.clientX, e.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        handleBurst(touch.clientX, touch.clientY);
      }
    };

    window.addEventListener('click', onClick);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleBurst]);

  return (
    <div className="app-container">
      <ParticleCanvas burstId={burst.id} burstX={burst.x} burstY={burst.y} />
      <div className="custom-cursor" ref={cursorRef} />
      <InfoCard trigger={burst.id} triggerX={burst.x} triggerY={burst.y} />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
