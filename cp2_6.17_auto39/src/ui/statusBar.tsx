import { Gauge, Clock, Database } from 'lucide-react';
import { useFPS } from '../utils/performance';
import { useGlobalStore } from '../store/useGlobalStore';

export function StatusBar() {
  const fps = useFPS(500);
  const lastUpdated = useGlobalStore(s => s.lastUpdated);
  const currentYear = useGlobalStore(s => s.currentYear);
  const routes = useGlobalStore(s => s.routes);

  const fpsColor = fps >= 40 ? '#00ff88' : fps >= 25 ? '#ffcc00' : '#ff3300';
  let formattedTime = '-';
  try {
    if (lastUpdated && lastUpdated !== '-') {
      formattedTime = new Date(lastUpdated).toLocaleTimeString('zh-CN');
    }
  } catch {
    // ignore
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 14px',
        background: 'rgba(13, 17, 23, 0.7)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        backdropFilter: 'blur(8px)',
        fontFamily: "'SF Mono', Menlo, Consolas, monospace",
        fontSize: 11,
        color: '#8b949e',
        pointerEvents: 'none',
        minWidth: 180
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Gauge size={12} color={fpsColor} />
        <span style={{ color: fpsColor, fontWeight: 600 }}>{fps} FPS</span>
        <span style={{ marginLeft: 'auto', fontSize: 10 }}>
          {fps >= 40 ? '流畅' : fps >= 25 ? '良好' : '较低'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Database size={12} color="#4ecdc4" />
        <span>航线 {routes.length} 条</span>
        <span style={{ marginLeft: 'auto' }}>年度 {currentYear}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={12} color="#8b949e" />
        <span>更新 {formattedTime}</span>
      </div>
    </div>
  );
}
