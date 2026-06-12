import React, { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateBezierPath } from '../utils/geoUtils';
import type { TravelNode } from '../types';

interface MapPanelProps {
  nodes: TravelNode[];
  onMapClick: (lat: number, lng: number) => void;
  activeNodeId: string | null;
  mapRef: React.MutableRefObject<L.Map | null>;
}

const MapPanel: React.FC<MapPanelProps> = ({
  nodes,
  onMapClick,
  activeNodeId,
  mapRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const drawPaths = useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || nodes.length < 1) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.x, size.y);

    const sorted = [...nodes].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i];
      const end = sorted[i + 1];
      const bezierPoints = generateBezierPath(
        { lat: start.lat, lng: start.lng },
        { lat: end.lat, lng: end.lng }
      );

      const gradient = ctx.createLinearGradient(
        map.latLngToContainerPoint([start.lat, start.lng]).x,
        map.latLngToContainerPoint([start.lat, start.lng]).y,
        map.latLngToContainerPoint([end.lat, end.lng]).x,
        map.latLngToContainerPoint([end.lat, end.lng]).y
      );
      gradient.addColorStop(0, 'rgba(30, 70, 130, 0.85)');
      gradient.addColorStop(0.5, 'rgba(45, 140, 160, 0.85)');
      gradient.addColorStop(1, 'rgba(45, 212, 168, 0.85)');

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      bezierPoints.forEach((pt, idx) => {
        const point = map.latLngToContainerPoint([pt.lat, pt.lng]);
        if (idx === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    }

    sorted.forEach((node) => {
      const point = map.latLngToContainerPoint([node.lat, node.lng]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#2a3b4c';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      const point = map.latLngToContainerPoint([last.lat, last.lng]);
      const time = Date.now() / 1000;
      const pulseRadius = 10 + Math.sin(time * 3) * 4;
      const pulseOpacity = 0.6 + Math.sin(time * 3) * 0.3;

      ctx.beginPath();
      ctx.arc(point.x, point.y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240, 194, 122, ${pulseOpacity})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f0c27a';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [nodes, mapRef]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [31.2304, 121.4737],
      zoom: 4,
      zoomControl: true,
      zoomAnimation: true,
      fadeAnimation: true,
      preferCanvas: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    const canvas = L.DomUtil.create('canvas', 'path-canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '400';
    map.getPanes().overlayPane.appendChild(canvas);
    canvasRef.current = canvas;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    const updateCanvasPosition = () => {
      if (!canvas || !map) return;
      const bounds = map.getBounds();
      const topLeft = map.latLngToContainerPoint(bounds.getNorthWest());
      canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`;
    };

    map.on('move zoom moveend zoomend', () => {
      drawPaths();
    });

    map.whenReady(() => {
      setIsMapReady(true);
      setTimeout(drawPaths, 100);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapRef, onMapClick, drawPaths]);

  useEffect(() => {
    if (!isMapReady) return;
    drawPaths();
  }, [nodes, isMapReady, drawPaths]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    let lastTime = 0;
    const fps = 45;
    const interval = 1000 / fps;

    const animate = (time: number) => {
      if (time - lastTime >= interval) {
        drawPaths();
        lastTime = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMapReady, drawPaths, mapRef]);

  useEffect(() => {
    if (!mapRef.current || !activeNodeId) return;
    const node = nodes.find((n) => n.id === activeNodeId);
    if (!node) return;

    mapRef.current.flyTo([node.lat, node.lng], 13, {
      duration: 0.8,
      easeLinearity: 0.25,
    });
  }, [activeNodeId, nodes, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    nodes.forEach((node) => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: node.photoUrl
          ? `<div style="width:32px;height:32px;border-radius:50%;background-image:url('${node.photoUrl}');background-size:cover;border:2px solid ${
              node.id === activeNodeId ? '#f0c27a' : '#2a3b4c'
            };box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`
          : `<div style="width:24px;height:24px;border-radius:50%;background:${
              node.id === activeNodeId ? '#f0c27a' : '#2dd4a8'
            };border:2px solid #fff;"></div>`,
        iconSize: node.photoUrl ? [32, 32] : [24, 24],
        iconAnchor: node.photoUrl ? [16, 16] : [12, 12],
      });

      const marker = L.marker([node.lat, node.lng], { icon }).addTo(map);
      marker.bindPopup(
        `<div style="font-size:12px;color:#333;"><strong>${node.address
          .split(',')[0]
          .slice(0, 30)}</strong><br/>${node.description.slice(0, 50)}</div>`
      );
      markersRef.current.set(node.id, marker);
    });
  }, [nodes, activeNodeId, mapRef]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default MapPanel;
