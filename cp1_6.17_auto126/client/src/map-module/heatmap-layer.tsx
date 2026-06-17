import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { HeatmapPoint } from '../App';

interface HeatmapLayerProps {
  heatmapData: HeatmapPoint[];
}

function intensityToColor(intensity: number): { r: number; g: number; b: number } {
  const t = Math.max(0.3, Math.min(0.8, intensity));
  const normalized = (t - 0.3) / (0.8 - 0.3);
  if (normalized < 0.33) {
    const k = normalized / 0.33;
    return { r: 0, g: Math.round(150 * k + 100 * (1 - k)), b: 255 };
  } else if (normalized < 0.66) {
    const k = (normalized - 0.33) / 0.33;
    return { r: Math.round(255 * k), g: 200, b: Math.round(255 * (1 - k)) };
  } else {
    const k = (normalized - 0.66) / 0.34;
    return { r: 255, g: Math.round(165 * (1 - k)), b: 0 };
  }
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ heatmapData }) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<L.Layer | null>(null);
  const heatmapDataRef = useRef<HeatmapPoint[]>(heatmapData);

  useEffect(() => {
    heatmapDataRef.current = heatmapData;
  }, [heatmapData]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvasRef.current = canvas;

    const overlay = L.layer({
      onAdd: (mapInstance: L.Map) => {
        const pane = mapInstance.getPane('overlayPane');
        if (pane) pane.appendChild(canvas);
        updateCanvasPosition();
        drawHeatmap();
      },
      onRemove: () => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    } as any);

    overlay.addTo(map);
    layerRef.current = overlay;

    function updateCanvasPosition() {
      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = size.x + 'px';
      canvas.style.height = size.y + 'px';
      L.DomUtil.setPosition(canvas, topLeft);
    }

    const drawHeatmap = () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      updateCanvasPosition();
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const currentData = heatmapDataRef.current;
      currentData.forEach((point) => {
        const latLng = L.latLng(point.lat, point.lng);
        const containerPoint = map.latLngToContainerPoint(latLng);
        const x = containerPoint.x;
        const y = containerPoint.y;

        const normalizedIntensity = (Math.max(0.3, Math.min(0.8, point.intensity)) - 0.3) / (0.8 - 0.3);
        const radius = 80 + normalizedIntensity * 60;
        const baseIntensity = 0.3 + normalizedIntensity * 0.5;
        const color = intensityToColor(point.intensity);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${baseIntensity})`);
        gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${baseIntensity * 0.5})`);
        gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${baseIntensity * 0.2})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.4);
        innerGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${baseIntensity * 0.8})`);
        innerGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = innerGradient;
        ctx.fill();
      });
    };

    const handleMoveEnd = () => {
      updateCanvasPosition();
      drawHeatmap();
    };

    const handleZoomEnd = () => {
      updateCanvasPosition();
      drawHeatmap();
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleZoomEnd);
    map.on('resize', handleMoveEnd);

    (window as any).__drawHeatmap = drawHeatmap;

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleZoomEnd);
      map.off('resize', handleMoveEnd);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);

  useEffect(() => {
    if ((window as any).__drawHeatmap) {
      (window as any).__drawHeatmap();
    }
  }, [heatmapData]);

  return null;
};

export default HeatmapLayer;
