import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { RoutePoint, RouteWithPoints } from '../types';

export type { RoutePoint, RouteWithPoints };

interface MapProps {
  route: RouteWithPoints | null;
  points: RoutePoint[];
  onAddPoint: (point: Omit<RoutePoint, 'id' | 'orderIndex' | 'confirmed'>) => void;
  onUpdatePoint: (point: RoutePoint) => void;
  onPointRightClick: (point: RoutePoint) => void;
}

const createNumberedIcon = (number: number, confirmed: boolean) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${confirmed ? '#4caf50' : 'white'};
        border: 2px solid ${confirmed ? '#388e3c' : '#2196f3'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: ${confirmed ? 'white' : '#2196f3'};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">${number}</div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const MapController: React.FC<{ center?: [number, number]; zoom?: number; points: RoutePoint[] }> = ({
  center,
  zoom,
  points,
}) => {
  const map = useMap();

  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);

  return null;
};

const MapEventHandler: React.FC<{
  onDblClick: (lat: number, lng: number) => void;
}> = ({ onDblClick }) => {
  useMapEvents({
    dblclick: (e) => {
      onDblClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const DraggableMarker: React.FC<{
  point: RoutePoint;
  index: number;
  prevPoint?: RoutePoint;
  onDragEnd: (point: RoutePoint) => void;
  onRightClick: (point: RoutePoint) => void;
  onConfirm: (point: RoutePoint, name: string, note: string) => void;
  onCancel: () => void;
}> = ({ point, index, prevPoint, onDragEnd, onRightClick, onConfirm, onCancel }) => {
  const markerRef = useRef<L.Marker>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragLatLng, setDragLatLng] = useState<[number, number] | null>(null);
  const [name, setName] = useState(point.name);
  const [note, setNote] = useState(point.note);

  useEffect(() => {
    if (!point.confirmed && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [point.confirmed]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = () => {
    const marker = markerRef.current;
    if (marker) {
      const latLng = marker.getLatLng();
      setDragLatLng([latLng.lat, latLng.lng]);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    const marker = markerRef.current;
    if (marker) {
      const latLng = marker.getLatLng();
      onDragEnd({
        ...point,
        lat: latLng.lat,
        lng: latLng.lng,
      });
    }
    setDragLatLng(null);
  };

  const handleContextMenu = (e: L.LeafletMouseEvent) => {
    if (point.confirmed) {
      e.originalEvent.preventDefault();
      onRightClick(point);
    }
  };

  const handleConfirm = () => {
    if (!name.trim()) {
      alert('请输入名称');
      return;
    }
    onConfirm(point, name, note);
  };

  return (
    <>
      {isDragging && dragLatLng && prevPoint && (
        <Polyline
          positions={[
            [prevPoint.lat, prevPoint.lng],
            dragLatLng,
          ]}
          pathOptions={{
            color: '#888',
            dashArray: '8, 4',
            weight: 2,
            opacity: 0.6,
          }}
        />
      )}
      <Marker
        ref={markerRef}
        position={[point.lat, point.lng]}
        icon={createNumberedIcon(index + 1, point.confirmed)}
        draggable={true}
        eventHandlers={{
          dragstart: handleDragStart,
          drag: handleDrag,
          dragend: handleDragEnd,
          contextmenu: handleContextMenu,
        }}
      >
        {!point.confirmed && (
          <Popup
            closeOnClick={false}
            closeButton={false}
            autoClose={false}
          >
            <div
              style={{
                minWidth: 220,
                fontSize: '14px',
                lineHeight: 1.5,
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ marginBottom: 10, fontWeight: 'bold', color: '#333' }}>
                探险点 #{index + 1}
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>
                  名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入名称"
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>
                  备注（最多200字）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 200))}
                  placeholder="请输入备注"
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    resize: 'none',
                    height: 60,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: 11, color: '#999', textAlign: 'right', marginTop: 2 }}>
                  {note.length}/200
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={handleConfirm}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#388e3c')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4caf50')}
                >
                  确认
                </button>
                <button
                  onClick={onCancel}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#7f8c8d')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#95a5a6')}
                >
                  取消
                </button>
              </div>
            </div>
          </Popup>
        )}
        {point.confirmed && (
          <Popup>
            <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                {point.name}
              </div>
              {point.note && <div style={{ color: '#666' }}>{point.note}</div>}
              <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                右键点击添加日志
              </div>
            </div>
          </Popup>
        )}
      </Marker>
    </>
  );
};

const Map: React.FC<MapProps> = ({ route, points, onAddPoint, onUpdatePoint, onPointRightClick }) => {
  const [unconfirmedPoint, setUnconfirmedPoint] = useState<RoutePoint | null>(null);

  const handleDblClick = useCallback(
    (lat: number, lng: number) => {
      if (unconfirmedPoint) {
        return;
      }
      const tempPoint: RoutePoint = {
        id: Date.now(),
        routeId: route?.id || 0,
        name: '',
        note: '',
        lat,
        lng,
        orderIndex: points.length,
        confirmed: false,
      };
      setUnconfirmedPoint(tempPoint);
    },
    [route, points.length, unconfirmedPoint]
  );

  const handleConfirm = (point: RoutePoint, name: string, note: string) => {
    onAddPoint({
      routeId: point.routeId,
      name,
      note,
      lat: point.lat,
      lng: point.lng,
    });
    setUnconfirmedPoint(null);
  };

  const handleCancel = () => {
    setUnconfirmedPoint(null);
  };

  const handleDragEnd = (point: RoutePoint) => {
    if (point.confirmed) {
      onUpdatePoint(point);
    } else {
      setUnconfirmedPoint(point);
    }
  };

  const displayPoints = unconfirmedPoint ? [...points, unconfirmedPoint] : points;
  const sortedPoints = [...displayPoints].sort((a, b) => a.orderIndex - b.orderIndex);

  const polylinePoints = points
    .filter((p) => p.confirmed)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((p) => [p.lat, p.lng] as [number, number]);

  const confirmedPoints = sortedPoints.filter((p) => p.confirmed);
  const useCluster = confirmedPoints.length > 100;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer
        center={[39.9042, 116.4074]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        doubleClickZoom={false}
      >
        <MapController points={points} />
        <MapEventHandler onDblClick={handleDblClick} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polylinePoints.length > 1 && (
          <Polyline
            positions={polylinePoints}
            pathOptions={{
              color: '#2196f3',
              weight: 4,
              opacity: 0.7,
            }}
          />
        )}

        {sortedPoints.map((point, index) => (
          <DraggableMarker
            key={point.id}
            point={point}
            index={index}
            prevPoint={index > 0 ? sortedPoints[index - 1] : undefined}
            onDragEnd={handleDragEnd}
            onRightClick={onPointRightClick}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
