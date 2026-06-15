import { useEffect, useRef, useState } from 'react';
import './PerformanceMonitor.css';

interface PerformanceMonitorProps {
  particleCount: number;
  connectionCount: number;
  onPerformanceDegrade?: (degraded: boolean) => void;
}

const PARTICLE_STRUCTURE_BYTES = 128;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PerformanceMonitor({
  particleCount,
  connectionCount,
  onPerformanceDegrade,
}: PerformanceMonitorProps) {
  const [fps, setFps] = useState(60);
  const [memoryBytes, setMemoryBytes] = useState(0);
  const [isDegraded, setIsDegraded] = useState(false);
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    const memory = particleCount * PARTICLE_STRUCTURE_BYTES
      + connectionCount * 24;
    setMemoryBytes(memory);
  }, [particleCount, connectionCount]);

  useEffect(() => {
    let rafId: number;
    let lowFpsCount = 0;
    let highFpsCount = 0;

    const measure = () => {
      framesRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        const currentFps = Math.round((framesRef.current * 1000) / delta);
        fpsHistoryRef.current.push(currentFps);
        if (fpsHistoryRef.current.length > 10) {
          fpsHistoryRef.current.shift();
        }

        const avgFps = Math.round(
          fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length
        );
        setFps(avgFps);

        if (avgFps < 45) {
          lowFpsCount++;
          highFpsCount = 0;
          if (lowFpsCount >= 2 && !isDegraded) {
            setIsDegraded(true);
            onPerformanceDegrade?.(true);
          }
        } else if (avgFps >= 50) {
          highFpsCount++;
          lowFpsCount = 0;
          if (highFpsCount >= 3 && isDegraded) {
            setIsDegraded(false);
            onPerformanceDegrade?.(false);
          }
        }

        framesRef.current = 0;
        lastTimeRef.current = now;
      }

      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [isDegraded, onPerformanceDegrade]);

  const fpsColor = fps >= 50 ? '#6bcb77' : fps >= 45 ? '#ffd93d' : '#ff6b9d';

  return (
    <div className="performance-monitor">
      {isDegraded && (
        <div className="perf-warning">
          <span className="warning-icon">⚠</span>
          性能受限：连线数已降至 2000
        </div>
      )}
      <div className="perf-stats">
        <div className="perf-item">
          <span className="perf-label">FPS</span>
          <span className="perf-value" style={{ color: fpsColor }}>{fps}</span>
        </div>
        <div className="perf-item">
          <span className="perf-label">粒子</span>
          <span className="perf-value">{particleCount}</span>
        </div>
        <div className="perf-item">
          <span className="perf-label">连线</span>
          <span className="perf-value">{connectionCount}</span>
        </div>
        <div className="perf-item">
          <span className="perf-label">内存</span>
          <span className="perf-value">{formatBytes(memoryBytes)}</span>
        </div>
      </div>
    </div>
  );
}
