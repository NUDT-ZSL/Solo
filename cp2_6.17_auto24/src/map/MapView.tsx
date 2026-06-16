import { useEffect, useRef, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import ItemList from '../item/ItemList';
import MapLegend from './MapLegend';
import type { Station } from '../types';

interface StationsResponse {
  stations: Station[];
  stationItemCount: Record<string, number>;
  lineColors: Record<string, string>;
}

interface MapViewProps {
  onStationSelect?: (station: Station) => void;
}

export default function MapView({ onStationSelect }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationItemCount, setStationItemCount] = useState<Record<string, number>>({});
  const [lineColors, setLineColors] = useState<Record<string, string>>({});
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const { get, loading } = useApi<StationsResponse>();

  const loadStations = useCallback(async () => {
    const result = await get('/api/stations');
    if (result) {
      setStations(result.stations);
      setStationItemCount(result.stationItemCount);
      setLineColors(result.lineColors);
    }
  }, [get]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || stations.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(offset.x + rect.width / 2, offset.y + rect.height / 2);
    ctx.scale(scale, scale);

    const lines: Record<string, Station[]> = {};
    stations.forEach(station => {
      if (!lines[station.line]) lines[station.line] = [];
      lines[station.line].push(station);
    });

    Object.entries(lines).forEach(([lineName, lineStations]) => {
      ctx.strokeStyle = lineColors[lineName] || '#9ca3af';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      lineStations.forEach((station, index) => {
        if (index === 0) {
          ctx.moveTo(station.x - 400, station.y - 300);
        } else {
          ctx.lineTo(station.x - 400, station.y - 300);
        }
      });
      ctx.stroke();
    });

    stations.forEach(station => {
      const x = station.x - 400;
      const y = station.y - 300;
      const isSelected = selectedStation?.id === station.id;
      const isHovered = hoveredStation?.id === station.id;
      const color = lineColors[station.line] || '#9ca3af';
      const radius = isSelected || isHovered ? 18 : 14;

      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.9)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      const count = stationItemCount[station.id] || 0;
      if (count > 0) {
        const text = count > 99 ? '99+' : String(count);
        const fontSize = 10;
        const textPaddingX = text.length > 2 ? 6 : 4;
        const badgeHeight = 18;
        const textWidth = ctx.measureText(text).width;
        const badgeWidth = Math.max(badgeHeight, textWidth + textPaddingX * 2);
        const badgeRadius = badgeHeight / 2;
        const badgeX = x + radius - 4;
        const badgeY = y - radius - 4;

        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(
          badgeX - badgeWidth / 2,
          badgeY - badgeHeight / 2,
          badgeWidth,
          badgeHeight,
          badgeRadius
        );
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, badgeX, badgeY);
      }

      ctx.fillStyle = '#1f2937';
      ctx.font = isHovered || isSelected ? 'bold 13px sans-serif' : '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(station.name, x, y + radius + 6);

      ctx.fillStyle = color;
      ctx.font = '10px sans-serif';
      ctx.fillText(station.line, x, y + radius + 22);
    });

    ctx.restore();
  }, [stations, stationItemCount, lineColors, selectedStation, hoveredStation, scale, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const getStationAtPosition = useCallback((clientX: number, clientY: number): Station | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - rect.width / 2 - offset.x) / scale + 400;
    const y = (clientY - rect.top - rect.height / 2 - offset.y) / scale + 300;

    for (const station of stations) {
      const dx = station.x - x;
      const dy = station.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 25) {
        return station;
      }
    }
    return null;
  }, [stations, offset, scale]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const station = getStationAtPosition(e.clientX, e.clientY);
    if (station) {
      setSelectedStation(prev => prev?.id === station.id ? null : station);
      if (onStationSelect) {
        onStationSelect(station);
      }
    }
  }, [getStationAtPosition, onStationSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const station = getStationAtPosition(e.clientX, e.clientY);
    setHoveredStation(station);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = station ? 'pointer' : 'grab';
    }
  }, [getStationAtPosition]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 2));
  }, []);

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const station = getStationAtPosition(e.clientX, e.clientY);
    if (!station) {
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, [getStationAtPosition]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseDrag = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  return (
    <div className="map-container" ref={containerRef}>
      <div className="map-header">
        <h2 className="map-title">🚇 地铁线路图</h2>
        <div className="map-controls">
          <button onClick={() => setScale(prev => Math.min(prev * 1.2, 2))} className="ctrl-btn">+</button>
          <button onClick={() => setScale(prev => Math.max(prev * 0.8, 0.5))} className="ctrl-btn">−</button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="ctrl-btn">⟲</button>
        </div>
      </div>

      <div className="canvas-wrapper">
        {loading && (
          <div className="map-loading">
            <div className="spinner" />
            <span>加载地图中...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="map-canvas"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMoveCapture={handleMouseDrag}
          onWheel={handleWheel}
        />
        <MapLegend lineColors={lineColors} />
      </div>

      {selectedStation && (
        <div className="station-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <span className="station-dot" style={{ backgroundColor: lineColors[selectedStation.line] }} />
              {selectedStation.name}
              <span className="line-badge" style={{ backgroundColor: lineColors[selectedStation.line] }}>
                {selectedStation.line}
              </span>
            </h3>
            <button className="close-btn" onClick={() => setSelectedStation(null)}>×</button>
          </div>
          <div className="item-count">
            当前站点共 <strong>{stationItemCount[selectedStation.id] || 0}</strong> 条失物信息
          </div>
          <div className="panel-content">
            <ItemList stationId={selectedStation.id} />
          </div>
        </div>
      )}

      <style>{`
        .map-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f9fafb;
        }
        
        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
        }
        
        .map-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .map-controls {
          display: flex;
          gap: 8px;
        }
        
        .ctrl-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.2);
          color: #ffffff;
          font-size: 18px;
          cursor: pointer;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .ctrl-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        
        .canvas-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        
        .map-canvas {
          width: 100%;
          height: 100%;
          min-height: 400px;
          cursor: grab;
        }
        
        .map-canvas:active {
          cursor: grabbing;
        }
        
        .map-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #6366f1;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e0e7ff;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .station-panel {
          position: absolute;
          right: 20px;
          top: 80px;
          width: 360px;
          max-height: calc(100% - 100px);
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          background: #f9fafb;
        }
        
        .panel-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .station-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .line-badge {
          padding: 2px 8px;
          border-radius: 4px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 500;
        }
        
        .close-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #6b7280;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        
        .close-btn:hover {
          background: #f3f4f6;
        }
        
        .item-count {
          padding: 12px 16px;
          font-size: 13px;
          color: #6b7280;
          background: #fefefe;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .item-count strong {
          color: #6366f1;
          font-size: 16px;
          margin: 0 4px;
        }
        
        .panel-content {
          flex: 1;
          overflow-y: auto;
        }
        
        @media (max-width: 768px) {
          .station-panel {
            position: fixed;
            right: 0;
            left: 0;
            top: auto;
            bottom: 0;
            width: 100%;
            max-height: 60vh;
            border-radius: 12px 12px 0 0;
          }
        }
      `}</style>
    </div>
  );
}
