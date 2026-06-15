import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { Waypoint } from '../http';

interface MapViewProps {
  waypoints: Waypoint[];
  selectedWaypointId: string | null;
  playbackIndex: number;
  isPlaying: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerClick: (id: string) => void;
  onPlaybackIndexChange: (index: number) => void;
}

function MapView({
  waypoints,
  selectedWaypointId,
  playbackIndex,
  isPlaying,
  onMapClick,
  onMarkerClick,
  onPlaybackIndexChange,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const pathLayerRef = useRef<L.LayerGroup | null>(null);
  const playbackLayersRef = useRef<L.LayerGroup | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  const sortedWaypoints = [...waypoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const interpolateColor = (t: number): string => {
    const start = { r: 72, g: 187, b: 120 };
    const end = { r: 229, g: 62, b: 62 };
    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const createGradientPolyline = useCallback(
    (coords: [number, number][], progress: number) => {
      if (coords.length < 2) return null;

      const layerGroup = L.layerGroup();
      const totalSegments = coords.length - 1;
      const visibleSegments = Math.floor(progress * totalSegments);
      const currentSegmentProgress = progress * totalSegments - visibleSegments;

      for (let i = 0; i <= visibleSegments && i < totalSegments; i++) {
        const t = i / totalSegments;
        const color = interpolateColor(t);
        let segCoords: [number, number][];

        if (i === visibleSegments && i < totalSegments) {
          const start = coords[i];
          const end = coords[i + 1];
          const interp: [number, number] = [
            start[0] + (end[0] - start[0]) * currentSegmentProgress,
            start[1] + (end[1] - start[1]) * currentSegmentProgress,
          ];
          segCoords = [start, interp];
        } else {
          segCoords = [coords[i], coords[i + 1]];
        }

        L.polyline(segCoords, {
          color,
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);
      }

      return layerGroup;
    },
    []
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30.0, 118.0],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }
    ).addTo(map);

    pathLayerRef.current = L.layerGroup().addTo(map);
    playbackLayersRef.current = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    sortedWaypoints.forEach((wp, index) => {
      const isSelected = wp.id === selectedWaypointId;
      const isPlaybackActive = index <= playbackIndex;

      const marker = L.circleMarker([wp.lat, wp.lng], {
        radius: isSelected || isPlaybackActive ? 10 : 8,
        fillColor: isPlaybackActive ? interpolateColor(index / Math.max(sortedWaypoints.length - 1, 1)) : '#e53e3e',
        color: isSelected ? '#2d3748' : '#ffffff',
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(mapRef.current!);

      const popupContent = `
        <div class="marker-popup">
          <div class="popup-title">路点 ${index + 1}</div>
          <div class="popup-info">
            <div>海拔: ${wp.elevation ?? '-'} m</div>
            <div>时间: ${new Date(wp.timestamp).toLocaleString('zh-CN')}</div>
          </div>
          ${wp.notes ? `<div class="popup-notes">${wp.notes}</div>` : ''}
          ${wp.photos.length > 0 ? `
            <div class="popup-photos">
              ${wp.photos.map((p) => `<img src="${p.thumbnail}" class="popup-thumb" />`).join('')}
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-popup',
        maxWidth: 260,
        closeButton: true,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onMarkerClick(wp.id);
      });

      markersRef.current.set(wp.id, marker);
    });

    if (sortedWaypoints.length > 1 && mapRef.current) {
      const bounds = L.latLngBounds(sortedWaypoints.map((w) => [w.lat, w.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [sortedWaypoints, selectedWaypointId, playbackIndex, onMarkerClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (pathLayerRef.current) {
      pathLayerRef.current.clearLayers();
    }

    if (sortedWaypoints.length >= 2) {
      const fullCoords: [number, number][] = sortedWaypoints.map((w) => [w.lat, w.lng]);

      L.polyline(fullCoords, {
        color: '#e2e8f0',
        weight: 3,
        opacity: 0.5,
        dashArray: '6, 8',
      }).addTo(pathLayerRef.current!);
    }
  }, [sortedWaypoints]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (playbackLayersRef.current) {
      playbackLayersRef.current.clearLayers();
    }

    if (sortedWaypoints.length < 2 || playbackIndex < 0) return;

    const coords: [number, number][] = sortedWaypoints.map((w) => [w.lat, w.lng]);
    const totalProgress = playbackIndex >= sortedWaypoints.length - 1
      ? 1
      : (playbackIndex + 1) / (sortedWaypoints.length - 1);

    const gradientLayer = createGradientPolyline(coords, totalProgress);
    if (gradientLayer) {
      gradientLayer.addTo(playbackLayersRef.current!);
    }

    if (playbackIndex >= 0 && playbackIndex < sortedWaypoints.length) {
      const currentWp = sortedWaypoints[playbackIndex];
      L.circleMarker([currentWp.lat, currentWp.lng], {
        radius: 14,
        fillColor: interpolateColor(playbackIndex / Math.max(sortedWaypoints.length - 1, 1)),
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(playbackLayersRef.current!);
    }
  }, [sortedWaypoints, playbackIndex, createGradientPolyline]);

  useEffect(() => {
    if (!isPlaying || sortedWaypoints.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const stepDuration = 1500;
    let startTime: number | null = null;
    let startIndex = Math.max(0, playbackIndex);

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const stepProgress = elapsed / stepDuration;

      if (stepProgress >= 1) {
        const nextIndex = startIndex + 1;
        if (nextIndex >= sortedWaypoints.length) {
          onPlaybackIndexChange(sortedWaypoints.length - 1);
          return;
        }
        onPlaybackIndexChange(nextIndex);
        startIndex = nextIndex;
        startTime = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, sortedWaypoints.length, onPlaybackIndexChange]);

  const handleGpxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const trkpts = xml.querySelectorAll('trkpt, wpt');

      trkpts.forEach((pt) => {
        const lat = parseFloat(pt.getAttribute('lat') || '0');
        const lon = parseFloat(pt.getAttribute('lon') || '0');
        if (lat && lon) {
          onMapClick(lat, lon);
        }
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="map-wrapper">
      <div className="map-controls">
        <button
          className="map-control-btn"
          onClick={() => gpxInputRef.current?.click()}
        >
          📁 上传GPX
        </button>
        <input
          ref={gpxInputRef}
          type="file"
          accept=".gpx,application/gpx+xml"
          style={{ display: 'none' }}
          onChange={handleGpxUpload}
        />
      </div>
      <div ref={containerRef} className="map-container-inner" />
    </div>
  );
}

export default MapView;
