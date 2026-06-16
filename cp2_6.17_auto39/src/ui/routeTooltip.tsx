import { Ship, Navigation } from 'lucide-react';
import { useGlobalStore, selectYearlyEmission, selectRouteById } from '../store/useGlobalStore';

export function RouteTooltip() {
  const tooltip = useGlobalStore(s => s.tooltip);
  const routes = useGlobalStore(s => s.routes);
  const currentYear = useGlobalStore(s => s.currentYear);

  if (!tooltip.visible || !tooltip.routeId) return null;

  const route = selectRouteById(tooltip.routeId);
  if (!route) return null;

  const yd = selectYearlyEmission(route, currentYear);
  const x = Math.min(tooltip.x + 16, window.innerWidth - 260);
  const y = tooltip.y - window.scrollY + 16;

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
        pointerEvents: 'none',
        minWidth: 240,
        maxWidth: 280,
        background: 'rgba(13, 17, 23, 0.95)',
        border: '1px solid rgba(78, 205, 196, 0.3)',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        color: '#c9d1d9',
        fontSize: 13,
        lineHeight: 1.5,
        backdropFilter: 'blur(8px)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, borderBottom: '1px solid #21262d', paddingBottom: 10 }}>
        <Ship size={16} color="#4ecdc4" />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{route.name}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px' }}>
        <span style={{ color: '#8b949e' }}>区域:</span>
        <span>{route.region}</span>
        <span style={{ color: '#8b949e' }}>{currentYear}年船舶:</span>
        <span style={{ fontFamily: "'SF Mono', monospace", color: '#ffdd55' }}>
          {yd.shipCount.toLocaleString()} 艘
        </span>
        <span style={{ color: '#8b949e' }}>{currentYear}年碳排放:</span>
        <span style={{ fontFamily: "'SF Mono', monospace", color: '#ff6b6b', fontWeight: 600 }}>
          {(yd.emission / 1_000_000).toFixed(2)} 百万吨
        </span>
        <span style={{ color: '#8b949e' }}>航线长度:</span>
        <span style={{ fontFamily: "'SF Mono', monospace" }}>
          {route.distanceKm.toLocaleString()} km
        </span>
      </div>
    </div>
  );
}
