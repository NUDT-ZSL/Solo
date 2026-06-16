import { useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Navigation,
  Anchor,
  Ruler,
  Ship,
  CloudRain,
  BarChart3,
  MapPin
} from 'lucide-react';
import { useGlobalStore, selectYearlyEmission, selectRouteById } from '../store/useGlobalStore';
import { interpolateRouteColor, normalize } from '../analysis/colorScale';
import type { ShippingRoute } from '../types';

export function InfoPanel() {
  const collapsed = useGlobalStore(s => s.panelCollapsed);
  const toggle = useGlobalStore(s => s.togglePanel);
  const selectedId = useGlobalStore(s => s.selectedRouteId);
  const focusedRegion = useGlobalStore(s => s.focusedRegion);
  const currentYear = useGlobalStore(s => s.currentYear);
  const routes = useGlobalStore(s => s.routes);

  const selectedRoute = useMemo(() => (selectedId ? selectRouteById(selectedId) : null), [selectedId, routes]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        right: 0,
        transform: 'translateY(-50%)',
        zIndex: 95,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: collapsed ? 40 : 280,
        maxHeight: '82vh'
      }}
    >
      <div
        style={{
          height: '100%',
          background: 'rgba(13, 17, 23, 0.78)',
          border: '1px solid rgba(78, 205, 196, 0.18)',
          borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          backdropFilter: 'blur(14px)',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          minHeight: 360
        }}
      >
        {!collapsed ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <PanelHeader toggle={toggle} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
              {selectedRoute ? (
                <RouteDetail route={selectedRoute} currentYear={currentYear} />
              ) : focusedRegion ? (
                <RegionSummary region={focusedRegion} />
              ) : (
                <GlobalSummary routes={routes} currentYear={currentYear} />
              )}
            </div>
          </div>
        ) : (
          <CollapsedTab toggle={toggle} />
        )}
      </div>
    </div>
  );
}

function PanelHeader({ toggle }: { toggle: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 12px 10px 16px',
        borderBottom: '1px solid #21262d'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={16} color="#4ecdc4" />
        <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>数据分析面板</span>
      </div>
      <button
        aria-label="折叠面板"
        onClick={toggle}
        onTouchStart={e => { e.preventDefault(); toggle(); }}
        style={{
          width: 28,
          height: 28,
          minWidth: 44,
          minHeight: 44,
          background: 'transparent',
          border: 'none',
          color: '#8b949e',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6
        }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function CollapsedTab({ toggle }: { toggle: () => void }) {
  return (
    <button
      aria-label="展开面板"
      onClick={toggle}
      onTouchStart={e => { e.preventDefault(); toggle(); }}
      style={{
        width: '100%',
        height: 240,
        background: 'transparent',
        border: 'none',
        color: '#4ecdc4',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 0
      }}
    >
      <ChevronLeft size={18} />
      <div
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 3
        }}
      >
        数 据 面 板
      </div>
      <ChevronLeft size={18} />
    </button>
  );
}

function Row({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
      <div style={{ marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#8b949e' }}>{label}</div>
        <div
          style={{
            fontSize: 13,
            color: valueColor || '#c9d1d9',
            fontWeight: 600,
            fontFamily: "'SF Mono', Menlo, monospace",
            wordBreak: 'break-all'
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function RouteDetail({ route, currentYear }: { route: ShippingRoute; currentYear: number }) {
  const yd = selectYearlyEmission(route, currentYear);
  const yearly = route.yearlyData.slice(-5);
  const maxE = Math.max(...yearly.map(y => y.emission));
  const minE = Math.min(...yearly.map(y => y.emission));

  return (
    <div>
      <div
        style={{
          padding: '12px 4px',
          borderBottom: '1px dashed #21262d',
          marginBottom: 4
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 4
          }}
        >
          {route.name}
        </div>
        <div style={{ fontSize: 11, color: '#4ecdc4', letterSpacing: 1 }}>
          {route.region.toUpperCase()}
        </div>
      </div>
      <Row
        icon={<Anchor size={14} color="#4ecdc4" />}
        label="起点港口"
        value={route.fromPort}
      />
      <Row
        icon={<Navigation size={14} color="#ff6b6b" />}
        label="终点港口"
        value={route.toPort}
      />
      <Row
        icon={<Ruler size={14} color="#ffdd55" />}
        label="航线长度"
        value={`${route.distanceKm.toLocaleString()} km`}
      />
      <Row
        icon={<Ship size={14} color="#4ecdc4" />}
        label={`${currentYear}年船舶流量`}
        value={`${yd.shipCount.toLocaleString()} 艘`}
        valueColor="#ffdd55"
      />
      <Row
        icon={<CloudRain size={14} color="#ff6b6b" />}
        label={`${currentYear}年碳排放`}
        value={`${(yd.emission / 1_000_000).toFixed(2)} 百万吨`}
        valueColor="#ff6b6b"
      />
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #21262d' }}>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 10, letterSpacing: 1 }}>
          近 5 年碳排放趋势
        </div>
        <BarChart yearly={yearly} min={minE} max={maxE} />
      </div>
    </div>
  );
}

function BarChart({ yearly, min, max }: { yearly: { year: number; emission: number }[]; min: number; max: number }) {
  const chartHeight = 110;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: chartHeight }}>
        {yearly.map(y => {
          const t = normalize(y.emission, min, max || 1);
          const h = Math.max(8, t * (chartHeight - 20));
          const color = interpolateRouteColor(t);
          return (
            <div key={y.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                title={`${y.year}: ${(y.emission / 1_000_000).toFixed(2)} 百万吨`}
                style={{
                  width: 40,
                  minWidth: 32,
                  height: h,
                  background: `linear-gradient(180deg, ${color}, ${color}88)`,
                  borderRadius: '4px 4px 2px 2px',
                  boxShadow: `0 0 10px ${color}44`,
                  transition: 'height 0.4s ease'
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: '#8b949e',
                  fontFamily: "'SF Mono', monospace"
                }}
              >
                {y.year}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RegionSummary({ region }: { region: NonNullable<ReturnType<typeof useGlobalStore.getState>['focusedRegion']> }) {
  return (
    <div>
      <div style={{ padding: '12px 4px', borderBottom: '1px dashed #21262d', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <MapPin size={16} color="#4ecdc4" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>区域航线摘要</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "'SF Mono', monospace", color: '#8b949e' }}>
          中心坐标: {region.label}
        </div>
      </div>
      <div style={{ padding: '8px 0 12px' }}>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>
          附近航线 ({region.routes.length})
        </div>
        {region.routes.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6a737d', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
            该区域暂无主要航线
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {region.routes.map(r => (
              <div
                key={r.id}
                style={{
                  padding: '8px 10px',
                  background: '#161b22',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#c9d1d9',
                  borderLeft: '3px solid #4ecdc4'
                }}
              >
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: '#8b949e' }}>
                  {r.distanceKm.toLocaleString()} km · {(r.totalEmissionTons / 1_000_000).toFixed(1)} 百万吨
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalSummary({ routes, currentYear }: { routes: ShippingRoute[]; currentYear: number }) {
  const totals = useMemo(() => {
    let ships = 0;
    let emission = 0;
    for (const r of routes) {
      const yd = selectYearlyEmission(r, currentYear);
      ships += yd.shipCount;
      emission += yd.emission;
    }
    return { ships, emission };
  }, [routes, currentYear]);

  return (
    <div>
      <div style={{ padding: '12px 4px', borderBottom: '1px dashed #21262d', marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          全球概览 {currentYear}
        </div>
        <div style={{ fontSize: 11, color: '#8b949e', letterSpacing: 1 }}>
          双击地球查看区域详情
        </div>
      </div>
      <Row
        icon={<Ship size={14} color="#4ecdc4" />}
        label="覆盖航线总数"
        value={`${routes.length} 条`}
      />
      <Row
        icon={<Navigation size={14} color="#ffdd55" />}
        label={`${currentYear}年总船舶数`}
        value={`${totals.ships.toLocaleString()} 艘`}
        valueColor="#ffdd55"
      />
      <Row
        icon={<CloudRain size={14} color="#ff6b6b" />}
        label={`${currentYear}年总碳排放`}
        value={`${(totals.emission / 1_000_000).toFixed(2)} 百万吨`}
        valueColor="#ff6b6b"
      />
      <div style={{ marginTop: 14, padding: '12px', background: '#161b22', borderRadius: 8, fontSize: 11, lineHeight: 1.6, color: '#8b949e' }}>
        <div style={{ fontWeight: 600, color: '#c9d1d9', marginBottom: 6 }}>💡 使用提示</div>
        <div>• 拖拽旋转地球 / 滚轮缩放</div>
        <div>• 双击地球表面聚焦该区域</div>
        <div>• 悬停航线查看详细数据</div>
        <div>• 点击航线在面板展示趋势</div>
        <div>• 时间轴播放观察年度变化</div>
      </div>
    </div>
  );
}
