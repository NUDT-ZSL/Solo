import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Coordinate,
  PlannedRoute,
  TrackPoint,
  Note,
} from '../types';
import { useAppStore } from '../store';
import { eventBus } from '../eventBus';
import { formatDateTime } from '../utils/helpers';

interface MapViewProps {
  mode: 'planning' | 'riding' | 'report';
  plannedRoute?: PlannedRoute | null;
  trackPoints?: TrackPoint[];
  notes?: Note[];
  showHistoryRecord?: {
    lat: number;
    lng: number;
    trackPoints?: TrackPoint[];
  } | null;
  onNoteClick?: (note: Note) => void;
  className?: string;
}

const PIN_SVG = (color: string, label?: string) => `
  <div style="position:relative;width:32px;height:40px;transform:translate(-50%,-100%);">
    <svg viewBox="0 0 32 40" width="32" height="40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="16" cy="16" r="5" fill="#ffffff"/>
    </svg>
    ${label ? `<div style="position:absolute;top:12px;left:0;right:0;text-align:center;font-size:10px;font-weight:700;color:#1e293b;">${label}</div>` : ''}
  </div>
`;

const THUMBTACK_SVG = `
  <svg viewBox="0 0 16 16" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 0L6 4l1 1-4 4 2 2 4-4 1 1 4-4-4-4z" fill="#f59e0b" stroke="#ffffff" stroke-width="0.5"/>
    <path d="M3 9l4 4-4 1 1-4z" fill="#d97706"/>
  </svg>
`;

function createWaypointIcon(color: string, label?: string): L.DivIcon {
  return L.divIcon({
    className: 'waypoint-marker',
    html: PIN_SVG(color, label),
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

function createNotePinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'note-marker',
    html: `<div style="transform:translate(-50%,-100%);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">${THUMBTACK_SVG}</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
    popupAnchor: [0, -16],
  });
}

const MapView: React.FC<MapViewProps> = ({
  mode,
  plannedRoute: propPlannedRoute,
  trackPoints: propTrackPoints,
  notes: propNotes,
  showHistoryRecord,
  onNoteClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const futureRouteLayerRef = useRef<L.Polyline | null>(null);
  const riddenLayerRef = useRef<L.Polyline | null>(null);
  const currentPosMarkerRef = useRef<L.CircleMarker | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const noteMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef<boolean>(false);

  const storeWaypoints = useAppStore((s) => s.waypoints);
  const storePlannedRoute = useAppStore((s) => s.plannedRoute);
  const storeCurrentPos = useAppStore((s) => s.currentPosition);
  const storeNotes = useAppStore((s) => s.notes);
  const setStartPoint = useAppStore((s) => s.setStartPoint);
  const setEndPoint = useAppStore((s) => s.setEndPoint);
  const addViaPoint = useAppStore((s) => s.addViaPoint);
  const showNoteBubble = useAppStore((s) => s.showNoteBubble);

  const effectivePlannedRoute = propPlannedRoute ?? storePlannedRoute;
  const effectiveTrackPoints = propTrackPoints ?? useAppStore.getState().trackPoints;
  const effectiveNotes = propNotes ?? storeNotes;

  const clearWaypointMarkers = () => {
    waypointMarkersRef.current.forEach((m) => {
      if (mapRef.current) m.removeFrom(mapRef.current);
    });
    waypointMarkersRef.current = [];
  };

  const renderWaypoints = () => {
    if (!mapRef.current) return;
    clearWaypointMarkers();
    const { start, vias, end } = storeWaypoints;
    if (start) {
      const m = L.marker([start.lat, start.lng], {
        icon: createWaypointIcon('#22c55e'),
      }).addTo(mapRef.current);
      m.bindTooltip('起点', { direction: 'top', offset: [0, -40] });
      waypointMarkersRef.current.push(m);
    }
    vias.forEach((via, i) => {
      const m = L.marker([via.lat, via.lng], {
        icon: createWaypointIcon('#f59e0b', String(i + 1)),
      }).addTo(mapRef.current!);
      m.bindTooltip(`途经点 ${i + 1}`, { direction: 'top', offset: [0, -40] });
      waypointMarkersRef.current.push(m);
    });
    if (end) {
      const m = L.marker([end.lat, end.lng], {
        icon: createWaypointIcon('#ef4444'),
      }).addTo(mapRef.current);
      m.bindTooltip('终点', { direction: 'top', offset: [0, -40] });
      waypointMarkersRef.current.push(m);
    }
  };

  const renderPlannedRoute = () => {
    if (!mapRef.current || !effectivePlannedRoute) return;
    if (routeLayerRef.current) {
      routeLayerRef.current.removeFrom(mapRef.current);
    }
    const coords = effectivePlannedRoute.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
    routeLayerRef.current = L.polyline(coords, {
      color: '#3b82f6',
      weight: 5,
      opacity: 0.85,
    }).addTo(mapRef.current);
  };

  const renderRiddenAndFuture = () => {
    if (!mapRef.current) return;
    if (riddenLayerRef.current) riddenLayerRef.current.removeFrom(mapRef.current);
    if (futureRouteLayerRef.current) futureRouteLayerRef.current.removeFrom(mapRef.current);

    const trackPts = effectiveTrackPoints;
    if (trackPts && trackPts.length > 0) {
      const riddenCoords = trackPts.map((t) => [t.lat, t.lng] as [number, number]);
      riddenLayerRef.current = L.polyline(riddenCoords, {
        color: '#22c55e',
        weight: 6,
        opacity: 0.9,
      }).addTo(mapRef.current);
    }

    if (effectivePlannedRoute && effectivePlannedRoute.coordinates.length > 0) {
      const totalCoords = effectivePlannedRoute.coordinates;
      let startIdx = 0;
      if (storeCurrentPos && totalCoords.length > 0) {
        let minDist = Infinity;
        totalCoords.forEach((c, i) => {
          const d = Math.hypot(c.lat - storeCurrentPos.lat, c.lng - storeCurrentPos.lng);
          if (d < minDist) {
            minDist = d;
            startIdx = i;
          }
        });
      }
      const futureCoords = totalCoords.slice(startIdx).map((c) => [c.lat, c.lng] as [number, number]);
      if (futureCoords.length > 1) {
        futureRouteLayerRef.current = L.polyline(futureCoords, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.6,
          dashArray: '10, 8',
        }).addTo(mapRef.current);
      }
    }
  };

  const renderCurrentPos = () => {
    if (!mapRef.current || !storeCurrentPos) return;
    if (!currentPosMarkerRef.current) {
      currentPosMarkerRef.current = L.circleMarker([storeCurrentPos.lat, storeCurrentPos.lng], {
        radius: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        color: '#ffffff',
        weight: 2,
      }).addTo(mapRef.current);
      (currentPosMarkerRef.current.getElement() as HTMLElement | null)?.style.setProperty(
        'filter',
        'drop-shadow(0 0 4px rgba(59,130,246,0.6))'
      );
    } else {
      currentPosMarkerRef.current.setLatLng([storeCurrentPos.lat, storeCurrentPos.lng]);
    }
    if (mode === 'riding') {
      mapRef.current.panTo([storeCurrentPos.lat, storeCurrentPos.lng], {
        animate: true,
        duration: 0.5,
      });
    }
  };

  const clearNoteMarkers = () => {
    noteMarkersRef.current.forEach((m) => {
      if (mapRef.current) m.removeFrom(mapRef.current);
    });
    noteMarkersRef.current.clear();
  };

  const renderNotes = () => {
    if (!mapRef.current) return;
    clearNoteMarkers();
    effectiveNotes.forEach((note) => {
      const m = L.marker([note.lat, note.lng], {
        icon: createNotePinIcon(),
      }).addTo(mapRef.current!);
      const tooltipText = `${note.text}\n${formatDateTime(note.timestamp)}`;
      m.bindTooltip(tooltipText, { direction: 'top', offset: [0, -16] });
      if (mode === 'report' && onNoteClick) {
        m.on('click', () => onNoteClick(note));
      }
      noteMarkersRef.current.set(note.id, m);
    });
  };

  const renderReportMode = () => {
    if (!mapRef.current) return;
    if (routeLayerRef.current) routeLayerRef.current.removeFrom(mapRef.current);
    const trackPts = propTrackPoints ?? effectiveTrackPoints;
    if (trackPts && trackPts.length > 0) {
      const coords = trackPts.map((t) => [t.lat, t.lng] as [number, number]);
      routeLayerRef.current = L.polyline(coords, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.85,
      }).addTo(mapRef.current);
      const bounds = L.latLngBounds(coords);
      effectiveNotes.forEach((n) => bounds.extend([n.lat, n.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
    if (showHistoryRecord) {
      mapRef.current.setView([showHistoryRecord.lat, showHistoryRecord.lng], 14);
    }
  };

  const startLongPress = (latlng: L.LatLng) => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      showNoteBubble(latlng.lat, latlng.lng);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const bindPlanningClick = () => {
    if (!mapRef.current) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (longPressFired.current) {
        longPressFired.current = false;
        return;
      }
      const coord: Coordinate = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        altitude: 0,
      };
      const wp = useAppStore.getState().waypoints;
      if (!wp.start) {
        setStartPoint(coord);
      } else if (!wp.end) {
        setEndPoint(coord);
      } else if (wp.vias.length < 5) {
        addViaPoint(coord);
      }
    };
    clickHandlerRef.current = handler;
    mapRef.current.on('click', handler);

    mapRef.current.on('mousedown', (e: L.LeafletMouseEvent) => startLongPress(e.latlng));
    mapRef.current.on('touchstart', (e: L.LeafletMouseEvent) => startLongPress(e.latlng));
    mapRef.current.on('mouseup', cancelLongPress);
    mapRef.current.on('touchend', cancelLongPress);
    mapRef.current.on('mousemove', cancelLongPress);
    mapRef.current.on('touchmove', cancelLongPress);
    mapRef.current.on('contextmenu', (e: L.LeafletMouseEvent) => {
      (e as any).originalEvent?.preventDefault?.();
      showNoteBubble(e.latlng.lat, e.latlng.lng);
    });
  };

  const bindRidingLongPress = () => {
    if (!mapRef.current) return;
    mapRef.current.on('mousedown', (e: L.LeafletMouseEvent) => startLongPress(e.latlng));
    mapRef.current.on('touchstart', (e: L.LeafletMouseEvent) => startLongPress(e.latlng));
    mapRef.current.on('mouseup', cancelLongPress);
    mapRef.current.on('touchend', cancelLongPress);
    mapRef.current.on('mousemove', cancelLongPress);
    mapRef.current.on('touchmove', cancelLongPress);
    mapRef.current.on('contextmenu', (e: L.LeafletMouseEvent) => {
      (e as any).originalEvent?.preventDefault?.();
      showNoteBubble(e.latlng.lat, e.latlng.lng);
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [39.9042, 116.4074],
      zoom: 12,
      zoomControl: true,
    });
    mapRef.current = map;

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    tilesLayerRef.current = tiles;

    map.setView([39.9042, 116.4074], 12);

    if (mode === 'planning') {
      bindPlanningClick();
    } else if (mode === 'riding') {
      bindRidingLongPress();
    }

    return () => {
      cancelLongPress();
      if (clickHandlerRef.current && mapRef.current) {
        mapRef.current.off('click', clickHandlerRef.current);
      }
      clearWaypointMarkers();
      clearNoteMarkers();
      if (routeLayerRef.current && mapRef.current) routeLayerRef.current.removeFrom(mapRef.current);
      if (futureRouteLayerRef.current && mapRef.current) futureRouteLayerRef.current.removeFrom(mapRef.current);
      if (riddenLayerRef.current && mapRef.current) riddenLayerRef.current.removeFrom(mapRef.current);
      if (currentPosMarkerRef.current && mapRef.current) currentPosMarkerRef.current.removeFrom(mapRef.current);
      if (tilesLayerRef.current && mapRef.current) tilesLayerRef.current.removeFrom(mapRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mode]);

  useEffect(() => {
    if (mode === 'planning') {
      renderWaypoints();
    }
  }, [storeWaypoints.start, storeWaypoints.vias.length, storeWaypoints.end, mode]);

  useEffect(() => {
    if (mode === 'planning') {
      renderPlannedRoute();
    }
  }, [effectivePlannedRoute, mode]);

  useEffect(() => {
    if (mode === 'riding') {
      renderRiddenAndFuture();
    }
  }, [effectiveTrackPoints?.length, effectivePlannedRoute, storeCurrentPos, mode]);

  useEffect(() => {
    if (mode === 'riding') {
      renderCurrentPos();
    }
  }, [storeCurrentPos, mode]);

  useEffect(() => {
    if (mode === 'riding' || mode === 'report') {
      renderNotes();
    }
  }, [effectiveNotes.length, mode]);

  useEffect(() => {
    if (mode === 'report') {
      renderReportMode();
      renderNotes();
    }
  }, [mode, propTrackPoints, showHistoryRecord]);

  useEffect(() => {
    const unsub = useAppStore.subscribe(
      (state) => state.notes.length,
      () => {
        if (mode === 'riding' || mode === 'report') {
          renderNotes();
        }
      }
    );
    return unsub;
  }, [mode]);

  useEffect(() => {
    const gpsHandler = (tp: TrackPoint) => {
      if (mode !== 'riding') return;
      void tp;
      renderRiddenAndFuture();
      renderCurrentPos();
    };
    eventBus.on('gps:update', gpsHandler);
    return () => eventBus.off('gps:update', gpsHandler);
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className={`leaflet-container ${className}`}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
    />
  );
};

export default MapView;
