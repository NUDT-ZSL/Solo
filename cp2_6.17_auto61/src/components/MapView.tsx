import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Waypoint, SupplyPoint } from '../types';
import './MapView.css';

const WAYPOINT_ICON = L.divIcon({
  className: 'waypoint-marker',
  html: '<div class="waypoint-dot"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const SUPPLY_ICON = L.divIcon({
  className: 'supply-marker',
  html: '<div class="supply-drop"><svg width="24" height="30" viewBox="0 0 24 30"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18s12-9 12-18C24 5.4 18.6 0 12 0z" fill="#42a5f5"/><circle cx="12" cy="12" r="5" fill="#fff" opacity="0.6"/></svg></div>',
  iconSize: [24, 30],
  iconAnchor: [12, 30],
});

const SUPPLY_APPROVED_ICON = L.divIcon({
  className: 'supply-marker approved',
  html: '<div class="supply-drop"><svg width="24" height="30" viewBox="0 0 24 30"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18s12-9 12-18C24 5.4 18.6 0 12 0z" fill="#42a5f5"/><circle cx="12" cy="12" r="5" fill="#fff" opacity="0.6"/></svg><div class="check-mark">✓</div></div>',
  iconSize: [24, 30],
  iconAnchor: [12, 30],
});

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateArrival(waypoints: Waypoint[], index: number): string {
  if (index === 0) return '起点';
  let totalHours = 0;
  for (let i = 1; i <= index; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalHours += dist / 5;
  }
  const hours = Math.floor(totalHours);
  const mins = Math.round((totalHours - hours) * 60);
  return `${hours}小时${mins}分钟`;
}

interface MapViewProps {
  activity: Activity | null;
  role: 'leader' | 'member';
  currentSegment: number;
  memberGps: { lat: number; lng: number } | null;
  supplyPointMode: boolean;
  setSupplyPointMode: (v: boolean) => void;
  onAddWaypoint: (lat: number, lng: number) => void;
  onWaypointDrag: (wpId: string, lat: number, lng: number) => void;
  onAddSupplyPoint: (data: { name: string; lat: number; lng: number; waterLiters: number; foodPortions: number }) => void;
  onSegmentChange: (idx: number) => void;
  onGpsUpdate: (lat: number, lng: number) => void;
}

function DraggableWaypointMarker({ wp, onDragEnd }: { wp: Waypoint; onDragEnd: (id: string, lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDragEnd(wp.id, pos.lat, pos.lng);
      }
    },
  }), [wp.id, onDragEnd]);

  return (
    <Marker
      position={[wp.lat, wp.lng]}
      icon={WAYPOINT_ICON}
      draggable={true}
      ref={markerRef}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div className="waypoint-popup">
          <strong>{wp.name}</strong>
          {wp.altitude > 0 && <div>海拔: {wp.altitude}m</div>}
          <div>预计到达: {wp.estimatedArrival || '计算中...'}</div>
          {wp.note && <div>备注: {wp.note}</div>}
        </div>
      </Popup>
    </Marker>
  );
}

function MapClickHandler({ supplyPointMode, onAddWaypoint, onAddSupplyPoint, onMapClickForSupply }: {
  supplyPointMode: boolean;
  onAddWaypoint: (lat: number, lng: number) => void;
  onAddSupplyPoint: (data: any) => void;
  onMapClickForSupply: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    contextmenu(e) {
      e.originalEvent.preventDefault();
    },
    click(e) {
      if (supplyPointMode) {
        onMapClickForSupply(e.latlng.lat, e.latlng.lng);
        return;
      }
    },
  });
  return null;
}

function GpsTracker({ onGpsUpdate, role }: { onGpsUpdate: (lat: number, lng: number) => void; role: string }) {
  const map = useMap();
  const lastUpdateRef = useRef<number>(0);
  const offlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (role !== 'member') return;
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const now = Date.now();
            if (now - lastUpdateRef.current >= 5000) {
              lastUpdateRef.current = now;
              onGpsUpdate(pos.coords.latitude, pos.coords.longitude);
            }
          },
          () => {}
        );
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [role, onGpsUpdate]);

  return null;
}

export default function MapView({
  activity,
  role,
  currentSegment,
  memberGps,
  supplyPointMode,
  setSupplyPointMode,
  onAddWaypoint,
  onWaypointDrag,
  onAddSupplyPoint,
  onSegmentChange,
  onGpsUpdate,
}: MapViewProps) {
  const [supplyModal, setSupplyModal] = useState<{ lat: number; lng: number } | null>(null);
  const [supplyForm, setSupplyForm] = useState({ name: '', waterLiters: 0, foodPortions: 0 });
  const mapRef = useRef<L.Map | null>(null);

  const sortedWaypoints = useMemo(() => {
    if (!activity) return [];
    return [...activity.waypoints].sort((a, b) => a.order - b.order);
  }, [activity?.waypoints]);

  const routeSegments = useMemo(() => {
    const segments: { coords: [number, number][]; color: string; key: string }[] = [];
    for (let i = 0; i < sortedWaypoints.length - 1; i++) {
      const coords: [number, number][] = [
        [sortedWaypoints[i].lat, sortedWaypoints[i].lng],
        [sortedWaypoints[i + 1].lat, sortedWaypoints[i + 1].lng],
      ];
      let color = '#42a5f5';
      if (i < currentSegment) color = '#9e9e9e';
      else if (i === currentSegment) color = '#66bb6a';
      segments.push({ coords, color, key: `seg-${i}` });
    }
    return segments;
  }, [sortedWaypoints, currentSegment]);

  const mapCenter = useMemo((): [number, number] => {
    if (activity && sortedWaypoints.length > 0) {
      const mid = Math.floor(sortedWaypoints.length / 2);
      return [sortedWaypoints[mid].lat, sortedWaypoints[mid].lng];
    }
    if (activity) return [activity.startLat, activity.startLng];
    return [39.9042, 116.4074];
  }, [activity, sortedWaypoints]);

  const handleMapClickForSupply = useCallback((lat: number, lng: number) => {
    setSupplyModal({ lat, lng });
    setSupplyForm({ name: '', waterLiters: 0, foodPortions: 0 });
  }, []);

  const handleSupplySubmit = () => {
    if (supplyModal && supplyForm.name) {
      onAddSupplyPoint({
        name: supplyForm.name,
        lat: supplyModal.lat,
        lng: supplyModal.lng,
        waterLiters: supplyForm.waterLiters,
        foodPortions: supplyForm.foodPortions,
      });
      setSupplyModal(null);
      setSupplyPointMode(false);
    }
  };

  return (
    <div className="map-wrapper">
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="leaflet-map"
        ref={mapRef as any}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler
          supplyPointMode={supplyPointMode}
          onAddWaypoint={onAddWaypoint}
          onAddSupplyPoint={onAddSupplyPoint}
          onMapClickForSupply={handleMapClickForSupply}
        />
        <GpsTracker onGpsUpdate={onGpsUpdate} role={role} />
        {routeSegments.map(seg => (
          <Polyline
            key={seg.key}
            positions={seg.coords}
            pathOptions={{ color: seg.color, weight: 4, opacity: 0.9 }}
          />
        ))}
        {sortedWaypoints.map((wp) => (
          <DraggableWaypointMarker
            key={wp.id}
            wp={wp}
            onDragEnd={onWaypointDrag}
          />
        ))}
        {activity?.supplyPoints.map(sp => (
          <Marker
            key={sp.id}
            position={[sp.lat, sp.lng]}
            icon={sp.approved ? SUPPLY_APPROVED_ICON : SUPPLY_ICON}
            opacity={sp.approved ? 1 : 0.5}
          >
            <Popup>
              <div className="supply-popup">
                <strong>{sp.name}</strong>
                <div>💧 剩余水量: {sp.waterLiters}L</div>
                <div>🍞 剩余食物: {sp.foodPortions}份</div>
                <div>添加时间: {new Date(sp.addedAt).toLocaleString('zh-CN')}</div>
                <div>状态: {sp.approved ? '✅ 已审批' : '⏳ 待审批'}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        {memberGps && (
          <Marker
            position={[memberGps.lat, memberGps.lng]}
            icon={L.divIcon({
              className: 'gps-marker',
              html: '<div class="gps-dot"><div class="gps-pulse"></div></div><div class="gps-label">我的位置</div>',
              iconSize: [8, 8],
              iconAnchor: [4, 4],
            })}
          />
        )}
      </MapContainer>
      <div className="map-toolbar">
        {role === 'leader' && activity?.status === 'planning' && (
          <button className="map-btn" onClick={() => {
            if (sortedWaypoints.length > 0) {
              const last = sortedWaypoints[sortedWaypoints.length - 1];
              onAddWaypoint(last.lat + 0.005, last.lng + 0.005);
            } else if (activity) {
              onAddWaypoint(activity.startLat, activity.startLng);
            }
          }}>
            ➕ 添加途经点
          </button>
        )}
        <button
          className={`map-btn ${supplyPointMode ? 'active' : ''}`}
          onClick={() => setSupplyPointMode(!supplyPointMode)}
        >
          💧 {supplyPointMode ? '点击地图放置补给点' : '添加补给点'}
        </button>
        {supplyPointMode && (
          <div className="supply-hint">点击地图任意位置添加补给点</div>
        )}
      </div>
      <div className="map-legend">
        <div className="legend-item"><span className="legend-line" style={{ background: '#9e9e9e' }}></span>已走</div>
        <div className="legend-item"><span className="legend-line" style={{ background: '#66bb6a' }}></span>当前</div>
        <div className="legend-item"><span className="legend-line" style={{ background: '#42a5f5' }}></span>未走</div>
      </div>
      {supplyModal && (
        <div className="supply-modal-overlay" onClick={() => setSupplyModal(null)}>
          <div className="supply-modal" onClick={e => e.stopPropagation()}>
            <h3>添加补给点</h3>
            <div className="supply-form-row">
              <label>名称</label>
              <input
                value={supplyForm.name}
                onChange={e => setSupplyForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="补给点名称"
              />
            </div>
            <div className="supply-form-row">
              <label>剩余水量 (升)</label>
              <input
                type="number"
                step="0.5"
                value={supplyForm.waterLiters}
                onChange={e => setSupplyForm(prev => ({ ...prev, waterLiters: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="supply-form-row">
              <label>剩余食物 (份)</label>
              <input
                type="number"
                step="1"
                value={supplyForm.foodPortions}
                onChange={e => setSupplyForm(prev => ({ ...prev, foodPortions: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="supply-form-actions">
              <button className="btn btn-primary" onClick={handleSupplySubmit}>提交</button>
              <button className="btn btn-secondary" onClick={() => setSupplyModal(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


