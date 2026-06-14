import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { eventBus } from '../event-bus';
import { stationMonitor } from '../services/StationMonitor';
import type { StationStatus, CrowdLevel } from '../services/StationMonitor';

const CROWD_COLORS: Record<CrowdLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444'
};

const CROWD_LABELS: Record<CrowdLevel, string> = {
  green: '宽松',
  yellow: '适中',
  orange: '拥挤',
  red: '爆满'
};

const ROW_HEIGHT = 52;
const VISIBLE_ROWS = 12;
const MIN_BUFFER_ROWS = 1;
const MAX_BUFFER_ROWS = 5;
const PANEL_PADDING = 16;

interface StationPanelProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

function calculateOverscan(scrollVelocity: number): number {
  const absVelocity = Math.abs(scrollVelocity);
  if (absVelocity < 5) return MIN_BUFFER_ROWS;
  if (absVelocity < 20) return 2;
  if (absVelocity < 50) return 3;
  if (absVelocity < 100) return 4;
  return MAX_BUFFER_ROWS;
}

export default function StationPanel({ isMobile, isOpen, onClose }: StationPanelProps) {
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [overscan, setOverscan] = useState(MIN_BUFFER_ROWS);
  const lastScrollTopRef = useRef(0);
  const lastScrollTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = eventBus.on('status:update', (data) => {
      const statuses = data as StationStatus[];
      requestAnimationFrame(() => {
        setStations(statuses);
      });
    });

    const initialStatuses = stationMonitor.getStationStatuses();
    if (initialStatuses.length > 0) {
      requestAnimationFrame(() => {
        setStations(initialStatuses);
      });
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const now = Date.now();
    const dt = now - lastScrollTimeRef.current;

    if (dt > 0) {
      const velocity = (currentScrollTop - lastScrollTopRef.current) / dt * 16;
      const newOverscan = calculateOverscan(velocity);
      setOverscan((prev) => (prev !== newOverscan ? newOverscan : prev));
    }

    lastScrollTopRef.current = currentScrollTop;
    lastScrollTimeRef.current = now;
    setScrollTop(currentScrollTop);
  }, []);

  const handleStationClick = useCallback((stationId: string) => {
    setSelectedId(stationId);
    eventBus.emit('station:click', stationId);
    if (isMobile && onClose) {
      onClose();
    }
  }, [isMobile, onClose]);

  const totalHeight = stations.length * ROW_HEIGHT;
  const scrollOffset = Math.max(0, scrollTop - PANEL_PADDING);
  const startIndex = Math.max(0, Math.floor(scrollOffset / ROW_HEIGHT) - overscan);
  const endIndex = Math.min(
    stations.length,
    startIndex + VISIBLE_ROWS + overscan * 2
  );

  const visibleStations = useMemo(() => {
    return stations.slice(startIndex, endIndex);
  }, [stations, startIndex, endIndex]);

  const offsetY = startIndex * ROW_HEIGHT;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        maxHeight: 'calc(100vh - 80px)',
        width: 'auto',
        background: '#1a1a2e',
        borderRadius: 12,
        padding: PANEL_PADDING,
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: isOpen ? 'block' : 'none'
      }
    : {
        position: 'fixed',
        left: 16,
        top: 'calc(48px + 20px)',
        width: 320,
        height: 'calc(100vh - 48px - 40px)',
        background: '#1a1a2e',
        borderRadius: 12,
        padding: PANEL_PADDING,
        boxSizing: 'border-box',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        zIndex: 100
      };

  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'white',
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>站点列表</span>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
          {stations.length} 个站点
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: 'calc(100% - 36px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative'
        }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ position: 'absolute', top: offsetY, width: '100%' }}>
            {visibleStations.map((station) => {
              const isSelected = selectedId === station.id;
              const isFault = station.status === 'fault';
              const bgColor = isFault
                ? '#7f1d1d'
                : isSelected
                ? '#334155'
                : 'transparent';

              return (
                <div
                  key={station.id}
                  onClick={() => handleStationClick(station.id)}
                  style={{
                    height: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    backgroundColor: bgColor,
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    if (!isFault && !isSelected) {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFault && !isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: isFault ? '#ef4444' : CROWD_COLORS[station.crowdLevel],
                      flexShrink: 0,
                      boxShadow: isFault ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none'
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        color: 'white',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {station.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
                        marginTop: 2
                      }}
                    >
                      {isFault ? '故障' : CROWD_LABELS[station.crowdLevel]} · {Math.round(station.flowRate)} 人/时
                    </div>
                  </div>

                  {isFault && (
                    <span
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 500,
                        flexShrink: 0
                      }}
                    >
                      故障
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
