import { useEffect, useRef } from 'react';
import { lines, stations, getStationsByLineId, type Station } from './stationData';

interface MapRendererProps {
  selectedLineIds: string[];
  currentTime: number;
  selectedStation: Station | null;
  onStationClick: (station: Station) => void;
  selectionMode: 'station' | 'line';
}

export default function MapRenderer({
  selectedLineIds,
  currentTime,
  selectedStation,
  onStationClick,
  selectionMode,
}: MapRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      drawMap(ctx, rect.width, rect.height);
    };

    const drawMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);

      const padding = 40;
      const mapWidth = width - padding * 2;
      const mapHeight = height - padding * 2;

      const minX = Math.min(...stations.map((s) => s.x));
      const maxX = Math.max(...stations.map((s) => s.x));
      const minY = Math.min(...stations.map((s) => s.y));
      const maxY = Math.max(...stations.map((s) => s.y));

      const scaleX = mapWidth / (maxX - minX);
      const scaleY = mapHeight / (maxY - minY);
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (width - (maxX - minX) * scale) / 2;
      const offsetY = (height - (maxY - minY) * scale) / 2;

      const transformX = (x: number) => offsetX + (x - minX) * scale;
      const transformY = (y: number) => offsetY + (y - minY) * scale;

      const maxFlow = Math.max(...stations.map((s) => s.passengerFlow[currentTime]));
      const minFlow = Math.min(...stations.map((s) => s.passengerFlow[currentTime]));

      lines.forEach((line) => {
        const lineStations = getStationsByLineId(line.id);
        const isSelected = selectedLineIds.length === 0 || selectedLineIds.includes(line.id);

        ctx.beginPath();
        ctx.strokeStyle = isSelected ? line.color : `${line.color}40`;
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        lineStations.forEach((station, index) => {
          const x = transformX(station.x);
          const y = transformY(station.y);
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      });

      stations.forEach((station) => {
        const line = lines.find((l) => l.id === station.lineId);
        if (!line) return;

        const isLineSelected = selectedLineIds.length === 0 || selectedLineIds.includes(station.lineId);
        const isStationSelected = selectedStation?.id === station.id;

        if (!isLineSelected && selectionMode === 'line') return;

        const x = transformX(station.x);
        const y = transformY(station.y);

        const flow = station.passengerFlow[currentTime];
        const normalizedFlow = (flow - minFlow) / (maxFlow - minFlow);

        const heatRadius = 15 + normalizedFlow * 25;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, heatRadius);
        const hue = 240 - normalizedFlow * 200;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 0.4)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 40%, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, heatRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, isStationSelected ? 10 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isStationSelected ? '#fff' : line.color;
        ctx.fill();
        ctx.strokeStyle = isStationSelected ? line.color : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isStationSelected || isLineSelected) {
          ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#e2e8f0';
          ctx.textAlign = 'center';
          ctx.fillText(station.name, x, y - 14);
        }
      });
    };

    resizeCanvas();

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const mapWidth = rect.width - 80;
      const mapHeight = rect.height - 80;

      const minX = Math.min(...stations.map((s) => s.x));
      const maxX = Math.max(...stations.map((s) => s.x));
      const minY = Math.min(...stations.map((s) => s.y));
      const maxY = Math.max(...stations.map((s) => s.y));

      const scaleX = mapWidth / (maxX - minX);
      const scaleY = mapHeight / (maxY - minY);
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (rect.width - (maxX - minX) * scale) / 2;
      const offsetY = (rect.height - (maxY - minY) * scale) / 2;

      for (const station of stations) {
        const sx = offsetX + (station.x - minX) * scale;
        const sy = offsetY + (station.y - minY) * scale;
        const dist = Math.sqrt((clickX - sx) ** 2 + (clickY - sy) ** 2);

        if (dist < 20) {
          onStationClick(station);
          break;
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [selectedLineIds, currentTime, selectedStation, onStationClick, selectionMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
    </div>
  );
}
