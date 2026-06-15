import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../data/store';

export function PerformanceIndicator() {
  const fps = useAppStore((s) => s.fps);
  const discoveredCount = useAppStore((s) => s.discoveredArtifacts.length);
  const fpsRef = useRef(fps);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    fpsRef.current = fps;
    forceUpdate((n) => n + 1);
  }, [fps]);

  const fpsColor = fps < 30 ? '#ff1744' : '#76ff03';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '200px',
        height: '60px',
        borderRadius: '8px',
        background: 'rgba(0, 50, 100, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(129, 212, 250, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px',
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease-out',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: fpsColor,
            fontFamily: 'monospace',
            transition: 'color 0.3s ease-out',
          }}
        >
          {fps}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#78909c',
            marginTop: '2px',
          }}
        >
          FPS
        </div>
      </div>

      <div
        style={{
          width: '1px',
          height: '32px',
          background: 'rgba(129, 212, 250, 0.2)',
        }}
      />

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#b2ff59',
            fontFamily: 'monospace',
          }}
        >
          {discoveredCount}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#78909c',
            marginTop: '2px',
          }}
        >
          已发现
        </div>
      </div>
    </div>
  );
}
