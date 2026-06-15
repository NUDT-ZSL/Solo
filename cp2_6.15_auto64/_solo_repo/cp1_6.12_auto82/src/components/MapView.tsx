import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
  LayersControl,
} from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import { RunningRoute } from '../types';

interface MapViewProps {
  routes: RunningRoute[];
  showHeatmap: boolean;
  selectedRouteId: string | null;
}

const MIN_PACE = 4;
const MAX_PACE = 10;
const HEATMAP_RADIUS = 20;
const HEATMAP_MAX_OPACITY = 0.7;
const ANIMATION_DURATION = 900;

const hex = (v: number): string => {
  const s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
  return s.length === 1 ? '0' + s : s;
};

export const paceToColor = (pace: number, min = MIN_PACE, max = MAX_PACE): string => {
  const t = Math.max(0, Math.min(1, (pace - min) / (max - min)));
  const r = Math.round(t * 255);
  const g = Math.round((1 - t) * 255);
  const b = 0;
  return `#${hex(r)}${hex(g)}${hex(b)}`;
};

const HEAT_COLORS = [
  [0, 0, 255],
  [0, 255, 255],
  [255, 255, 0],
  [255, 165, 0],
  [255, 0, 0],
];

const heatColor = (t: number): [number, number, number] => {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (HEAT_COLORS.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const c0 = HEAT_COLORS[Math.min(idx, HEAT_COLORS.length - 1)];
  const c1 = HEAT_COLORS[Math.min(idx + 1, HEAT_COLORS.length - 1)];
  return [
    c0[0] + (c1[0] - c0[0]) * frac,
    c0[1] + (c1[1] - c0[1]) * frac,
    c0[2] + (c1[2] - c0[2]) * frac,
  ];
};

const gaussianKDE = (
  points: [number, number][],
  x: number,
  y: number,
  bandwidth: number
): number => {
  let sum = 0;
  const twoSigma2 = 2 * bandwidth * bandwidth;
  for (const [px, py] of points) {
    const dx = px - x;
    const dy = py - y;
    sum += Math.exp(-(dx * dx + dy * dy) / twoSigma2);
  }
  return sum / (Math.PI * twoSigma2);
};

const MapBoundsFit: React.FC<{ routes: RunningRoute[] }> = ({ routes }) => {
  const map = useMap();
  useEffect(() => {
    if (!routes.length) return;
    const all: [number, number][] = [];
    routes.forEach((r) =>
      r.coordinates.forEach((c) => all.push([c.lat, c.lng]))
    );
    if (all.length === 0) return;
    const bounds = new LatLngBounds(all);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [routes, map]);
  return null;
};

interface HeatmapCanvasProps {
  routes: RunningRoute[];
  showHeatmap: boolean;
}

const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({ routes, showHeatmap }) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);
  const progressRef = useRef<number>(showHeatmap ? 1 : 0);

  const initOverlay = () => {
    if (!containerRef.current) {
      const pane = map.getPane('overlayPane');
      if (!pane) return;
      const div = L.DomUtil.create('div', 'heatmap-overlay');
      div.style.position = 'absolute';
      div.style.top = '0';
      div.style.left = '0';
      div.style.pointerEvents = 'none';
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      div.appendChild(canvas);
      pane.appendChild(div);
      containerRef.current = div;
      canvasRef.current = canvas;
    }
  };

  const resizeAndReposition = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const size = map.getSize();
    canvasRef.current.width = size.x;
    canvasRef.current.height = size.y;
    canvasRef.current.style.width = size.x + 'px';
    canvasRef.current.style.height = size.y + 'px';
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    containerRef.current.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`;
    containerRef.current.style.width = size.x + 'px';
    containerRef.current.style.height = size.y + 'px';
  };

  const drawHeatmap = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!showHeatmap && progress <= 0) return;

    const allPoints: [number, number][] = [];
    routes.forEach((r) =>
      r.coordinates.forEach((c) => allPoints.push([c.lat, c.lng]))
    );
    if (allPoints.length === 0) return;

    const screenPts: [number, number][] = allPoints.map(([lat, lng]) => {
      const p = map.latLngToContainerPoint([lat, lng]);
      return [p.x, p.y];
    });

    const bandwidth = 30;
    const cell = 6;
    const currentRadius = HEATMAP_RADIUS * progress;
    const currentOpacity = HEATMAP_MAX_OPACITY * progress;

    if (progress <= 0.01) return;

    const values: { x: number; y: number; v: number }[] = [];
    let maxV = 0;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const v = gaussianKDE(screenPts, x, y, bandwidth);
        if (v > maxV) maxV = v;
        values.push({ x, y, v });
      }
    }
    if (maxV === 0) return;

    for (const { x, y, v } of values) {
      const t = v / maxV;
      if (t < 0.02) continue;
      const [r, g, b] = heatColor(t);
      const a = t * currentOpacity;
      ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
      ctx.beginPath();
      ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const animate = (ts: number) => {
    if (animStartRef.current === null) animStartRef.current = ts;
    const elapsed = ts - animStartRef.current;
    let t = elapsed / ANIMATION_DURATION;
    t = Math.max(0, Math.min(1, t));
    const ease = 1 - Math.pow(1 - t, 3);
    progressRef.current = showHeatmap ? ease : 1 - ease;
    drawHeatmap(progressRef.current);
    if (t < 1 && ((showHeatmap && progressRef.current < 1) || (!showHeatmap && progressRef.current > 0))) {
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (showHeatmap) {
        const loop = (tt: number) => {
          drawHeatmap(1);
        };
        animFrameRef.current = requestAnimationFrame(loop);
      }
      animFrameRef.current = null;
    }
  };

  useEffect(() => {
    initOverlay();
    resizeAndReposition();

    const onMove = () => {
      resizeAndReposition();
      drawHeatmap(progressRef.current);
    };
    map.on('move', onMove);
    map.on('zoom', onMove);
    map.on('resize', onMove);

    return () => {
      map.off('move', onMove);
      map.off('zoom', onMove);
      map.off('resize', onMove);
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
      }
      containerRef.current = null;
      canvasRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    animStartRef.current = null;
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [showHeatmap, routes]);

  useEffect(() => {
    resizeAndReposition();
    drawHeatmap(progressRef.current);
  }, [map, routes]);

  return null;
};

const MapView: React.FC<MapViewProps> = ({ routes, showHeatmap, selectedRouteId }) => {
  const center: [number, number] = useMemo(() => {
    if (routes.length === 0) return [31.2304, 121.4737];
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;
    routes.forEach((r) =>
      r.coordinates.forEach((c) => {
        sumLat += c.lat;
        sumLng += c.lng;
        count++;
      })
    );
    return count > 0 ? [sumLat / count, sumLng / count] : [31.2304, 121.4737];
  }, [routes]);

  const paceRange = useMemo(() => {
    if (routes.length === 0) return { min: MIN_PACE, max: MAX_PACE };
    const paces = routes.map((r) => r.avgPace);
    const min = Math.min(...paces);
    const max = Math.max(...paces);
    return { min: Math.max(MIN_PACE, min - 1), max: Math.min(MAX_PACE, max + 1) };
  }, [routes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={true}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsFit routes={routes} />
        {routes.map((route) => {
          const color = paceToColor(route.avgPace, paceRange.min, paceRange.max);
          const isSelected = selectedRouteId === route.id;
          const hasSelection = selectedRouteId !== null;
          const weight = isSelected ? 6 : 3;
          const opacity = hasSelection ? (isSelected ? 1.0 : 0.3) : 1.0;
          const positions: [number, number][] = route.coordinates.map((c) => [c.lat, c.lng]);
          return (
            <div key={route.id}>
              <Polyline
                positions={positions}
                pathOptions={{ color, weight, opacity }}
              />
              {positions.length >= 2 && (
                <>
                  <CircleMarker
                    center={positions[0]}
                    radius={5}
                    pathOptions={{ color, fillColor: color, fillOpacity: 1, opacity }}
                  />
                  <CircleMarker
                    center={positions[positions.length - 1]}
                    radius={5}
                    pathOptions={{ color, fillColor: color, fillOpacity: 1, opacity }}
                  />
                </>
              )}
            </div>
          );
        })}
        <HeatmapCanvas routes={routes} showHeatmap={showHeatmap} />
      </MapContainer>
    </div>
  );
};

export default MapView;
