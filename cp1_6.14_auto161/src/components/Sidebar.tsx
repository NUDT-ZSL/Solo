import React, { useState, useEffect, useRef } from 'react';
import { Bike, Search, X, MapPin } from 'lucide-react';
import { useAppStore } from '@/store';
import { searchPlace } from '@/utils/api';
import { PlannedRoute, Coordinate } from '@/types';
import { round1 } from '@/utils/helpers';

type SetMode = 'start' | 'end';

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface SidebarProps {
  onPlanRoute: () => void;
  onStartRide: () => void;
  isPlanning: boolean;
  isRiding: boolean;
  plannedRoute: PlannedRoute | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  onPlanRoute,
  onStartRide,
  isPlanning,
  isRiding,
  plannedRoute,
}) => {
  const waypoints = useAppStore((s) => s.waypoints);
  const setStartPoint = useAppStore((s) => s.setStartPoint);
  const setEndPoint = useAppStore((s) => s.setEndPoint);
  const addViaPoint = useAppStore((s) => s.addViaPoint);
  const clearWaypoints = useAppStore((s) => s.clearWaypoints);

  const [mode, setMode] = useState<SetMode>('start');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const data = await searchPlace(query);
      setResults(data.slice(0, 8) as SearchResult[]);
      setShowDropdown(true);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    const coord: Coordinate = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      altitude: 0,
    };
    if (mode === 'start') {
      setStartPoint(coord);
    } else {
      setEndPoint(coord);
    }
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const totalWaypoints =
    (waypoints.start ? 1 : 0) + waypoints.vias.length + (waypoints.end ? 1 : 0);

  const canPlan = waypoints.start && waypoints.end && !isRiding;

  return (
    <aside className="sidebar" style={{ overflowY: 'auto' }}>
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Bike size={24} color="#3b82f6" />
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
          RideTrack Pro
        </h1>
      </div>

      <div className="sidebar-search" ref={containerRef} style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'start' ? '搜索起点...' : '搜索终点...'}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            style={{ paddingLeft: '32px' }}
          />
        </div>
        {showDropdown && results.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% - 8px)',
              left: '16px',
              right: '16px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: '280px',
              overflowY: 'auto',
              zIndex: 1001,
            }}
          >
            {results.map((r, i) => (
              <div
                key={i}
                onClick={() => handleSelectResult(r)}
                style={{
                  padding: '10px 12px',
                  borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#475569',
                  transition: 'background 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <MapPin size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                <span style={{ verticalAlign: 'middle' }}>
                  {r.display_name.length > 50
                    ? r.display_name.slice(0, 50) + '...'
                    : r.display_name}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '6px',
            padding: '3px',
          }}
        >
          <button
            onClick={() => setMode('start')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              background: mode === 'start' ? '#ffffff' : 'transparent',
              color: mode === 'start' ? '#22c55e' : '#64748b',
              boxShadow: mode === 'start' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            设置起点
          </button>
          <button
            onClick={() => setMode('end')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              background: mode === 'end' ? '#ffffff' : 'transparent',
              color: mode === 'end' ? '#ef4444' : '#64748b',
              boxShadow: mode === 'end' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            设置终点
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>路径点</h3>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {waypoints.start ? (
            <div className="waypoint-item">
              <div className="waypoint-dot start" />
              <div style={{ marginLeft: '10px', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  起点
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  {waypoints.start.lat.toFixed(6)}, {waypoints.start.lng.toFixed(6)}
                </div>
              </div>
            </div>
          ) : null}

          {waypoints.vias.map((via, i) => (
            <div key={i} className="waypoint-item">
              <div className="waypoint-dot via" />
              <div style={{ marginLeft: '10px', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  途经点{i + 1}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  {via.lat.toFixed(6)}, {via.lng.toFixed(6)}
                </div>
              </div>
              <button
                onClick={() => {
                  const newVias = waypoints.vias.filter((_, idx) => idx !== i);
                  useAppStore.setState((s) => ({
                    waypoints: { ...s.waypoints, vias: newVias },
                  }));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#94a3b8',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = '#fef2f2';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {waypoints.end ? (
            <div className="waypoint-item">
              <div className="waypoint-dot end" />
              <div style={{ marginLeft: '10px', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  终点
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  {waypoints.end.lat.toFixed(6)}, {waypoints.end.lng.toFixed(6)}
                </div>
              </div>
            </div>
          ) : null}

          {totalWaypoints === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                或点击地图上任意位置选择坐标
              </p>
            </div>
          )}
        </div>
        {totalWaypoints > 0 && (
          <p
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            或点击地图上任意位置选择坐标
          </p>
        )}
      </div>

      {plannedRoute && (
        <div
          className="sidebar-section"
          style={{
            padding: '16px',
            background: '#1e293b',
            margin: '0 16px 16px',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            🚲 总里程：{round1(plannedRoute.totalDistance)} km
          </div>
          <div style={{ marginBottom: '6px' }}>
            ⏱️ 预计用时：{Math.round(plannedRoute.estimatedTime)} 分钟
          </div>
          <div>
            📍 共 {totalWaypoints} 个路径点
          </div>
        </div>
      )}

      <div style={{ padding: '16px', marginTop: 'auto', borderTop: '1px solid #f1f5f9' }}>
        {!plannedRoute && !isRiding && (
          <button
            className="btn-plan"
            onClick={onPlanRoute}
            disabled={!canPlan || isPlanning}
            style={{
              opacity: !canPlan || isPlanning ? 0.5 : 1,
              cursor: !canPlan || isPlanning ? 'not-allowed' : 'pointer',
            }}
          >
            {isPlanning ? '规划中...' : '规划路线'}
          </button>
        )}
        {plannedRoute && !isRiding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-start" onClick={onStartRide}>
              开始骑行
            </button>
            <button
              onClick={clearWaypoints}
              style={{
                width: '100%',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            >
              重新规划
            </button>
          </div>
        )}
        {isRiding && (
          <div
            style={{
              textAlign: 'center',
              padding: '12px',
              background: '#f0fdf4',
              borderRadius: '8px',
              color: '#16a34a',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            🚴 骑行中...显示当前位置
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
