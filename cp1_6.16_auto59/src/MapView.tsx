import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Province, CheckInRecord, getProvinceBounds } from './data';

interface MapViewProps {
  provinces: Province[];
  checkIns: CheckInRecord[];
  currentProvinceId: string | null;
  onProvinceDoubleClick: (provinceId: string) => void;
  onBackToCountry: () => void;
  onPinHover?: (record: CheckInRecord | null) => void;
  onAddClick?: () => void;
  isAddMode?: boolean;
}

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const PIN_RADIUS = 8;
const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const SCALE_STEP = 1.2;

const MapView: React.FC<MapViewProps> = ({
  provinces,
  checkIns,
  currentProvinceId,
  onProvinceDoubleClick,
  onBackToCountry,
  onPinHover,
  onAddClick,
  isAddMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [hoveredPin, setHoveredPin] = useState<CheckInRecord | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const lastMoveTimeRef = useRef(0);
  const animFrameRef = useRef<number>();
  const pendingRenderRef = useRef(false);

  const currentProvince = provinces.find(p => p.id === currentProvinceId);

  const getCanvasSize = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    return {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    };
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    const { width, height } = getCanvasSize();
    const x = (screenX - width / 2 - viewState.offsetX) / viewState.scale;
    const y = (screenY - height / 2 - viewState.offsetY) / viewState.scale;
    return { x, y };
  }, [viewState, getCanvasSize]);

  const worldToScreen = useCallback((worldX: number, worldY: number): { x: number; y: number } => {
    const { width, height } = getCanvasSize();
    const x = worldX * viewState.scale + width / 2 + viewState.offsetX;
    const y = worldY * viewState.scale + height / 2 + viewState.offsetY;
    return { x, y };
  }, [viewState, getCanvasSize]);

  const isPointInPolygon = useCallback((px: number, py: number, polygon: { x: number; y: number }[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  const getProvinceAtPoint = useCallback((worldX: number, worldY: number): Province | null => {
    for (let i = provinces.length - 1; i >= 0; i--) {
      if (isPointInPolygon(worldX, worldY, provinces[i].outline)) {
        return provinces[i];
      }
    }
    return null;
  }, [provinces, isPointInPolygon]);

  const getPinAtPoint = useCallback((worldX: number, worldY: number): CheckInRecord | null => {
    const threshold = PIN_RADIUS / viewState.scale;
    for (let i = checkIns.length - 1; i >= 0; i--) {
      const pin = checkIns[i];
      const dx = worldX - pin.position.x;
      const dy = worldY - pin.position.y;
      if (dx * dx + dy * dy <= threshold * threshold) {
        return pin;
      }
    }
    return null;
  }, [checkIns, viewState.scale]);

  const requestRender = useCallback(() => {
    if (pendingRenderRef.current) return;
    pendingRenderRef.current = true;
    animFrameRef.current = requestAnimationFrame(() => {
      pendingRenderRef.current = false;
      render();
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasSize();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + viewState.offsetX, height / 2 + viewState.offsetY);
    ctx.scale(viewState.scale, viewState.scale);

    const provinceCheckIns = currentProvinceId
      ? checkIns.filter(c => c.provinceId === currentProvinceId)
      : checkIns;

    const checkedProvinceIds = new Set(provinceCheckIns.map(c => c.provinceId));

    provinces.forEach(province => {
      if (currentProvinceId && province.id !== currentProvinceId) return;

      const hasCheckIn = checkedProvinceIds.has(province.id);
      const isHovered = hoveredProvince === province.id;

      ctx.beginPath();
      province.outline.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();

      if (hasCheckIn) {
        ctx.fillStyle = isHovered ? '#E67E22' : '#F39C12';
      } else {
        ctx.fillStyle = 'rgba(189, 195, 199, 0.4)';
      }
      ctx.fill();

      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 1.5 / viewState.scale;
      ctx.stroke();

      if (!currentProvinceId || province.id === currentProvinceId) {
        ctx.fillStyle = hasCheckIn ? '#FFFFFF' : '#7F8C8D';
        ctx.font = `${12 / viewState.scale}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(province.name, province.center.x, province.center.y);
      }
    });

    const displayCheckIns = currentProvinceId
      ? provinceCheckIns
      : checkIns;

    displayCheckIns.forEach(record => {
      const isHovered = hoveredPin?.id === record.id;
      const scale = isHovered ? 1.3 : 1;
      const pinRadius = PIN_RADIUS * scale;

      ctx.save();
      ctx.translate(record.position.x, record.position.y);

      ctx.beginPath();
      ctx.arc(0, -pinRadius * 0.3, pinRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#E74C3C';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5 / viewState.scale;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-pinRadius * 0.6, -pinRadius * 0.1);
      ctx.lineTo(0, pinRadius * 0.8);
      ctx.lineTo(pinRadius * 0.6, -pinRadius * 0.1);
      ctx.closePath();
      ctx.fillStyle = '#E74C3C';
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }, [viewState, provinces, checkIns, currentProvinceId, hoveredProvince, hoveredPin, getCanvasSize]);

  const zoomAt = useCallback((screenX: number, screenY: number, newScale: number) => {
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    if (clampedScale === viewState.scale) return;

    const { width, height } = getCanvasSize();
    const worldX = (screenX - width / 2 - viewState.offsetX) / viewState.scale;
    const worldY = (screenY - height / 2 - viewState.offsetY) / viewState.scale;

    const newOffsetX = screenX - width / 2 - worldX * clampedScale;
    const newOffsetY = screenY - height / 2 - worldY * clampedScale;

    setViewState({
      scale: clampedScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [viewState, getCanvasSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: viewState.offsetX,
      offsetY: viewState.offsetY
    };
  }, [viewState]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const now = performance.now();
    if (now - lastMoveTimeRef.current < 16) return;
    lastMoveTimeRef.current = now;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setViewState(prev => ({
        ...prev,
        offsetX: dragStartRef.current.offsetX + dx,
        offsetY: dragStartRef.current.offsetY + dy
      }));
      return;
    }

    const worldPos = screenToWorld(screenX, screenY);

    const pin = getPinAtPoint(worldPos.x, worldPos.y);
    if (pin) {
      setHoveredPin(pin);
      setTooltipPos({ x: e.clientX, y: e.clientY });
      setHoveredProvince(null);
      if (onPinHover) onPinHover(pin);
      return;
    }

    if (hoveredPin) {
      setHoveredPin(null);
      if (onPinHover) onPinHover(null);
    }

    if (!currentProvinceId) {
      const province = getProvinceAtPoint(worldPos.x, worldPos.y);
      if (province) {
        setHoveredProvince(province.id);
      } else if (hoveredProvince) {
        setHoveredProvince(null);
      }
    }
  }, [isDragging, screenToWorld, getPinAtPoint, getProvinceAtPoint, hoveredPin, hoveredProvince, currentProvinceId, onPinHover]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentProvinceId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    const province = getProvinceAtPoint(worldPos.x, worldPos.y);
    if (province) {
      onProvinceDoubleClick(province.id);
    }
  }, [screenToWorld, getProvinceAtPoint, currentProvinceId, onProvinceDoubleClick]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 1 / SCALE_STEP : SCALE_STEP;
    zoomAt(screenX, screenY, viewState.scale * delta);
  }, [viewState.scale, zoomAt]);

  const handleZoomIn = useCallback(() => {
    const { width, height } = getCanvasSize();
    zoomAt(width / 2, height / 2, viewState.scale * SCALE_STEP);
  }, [viewState.scale, zoomAt, getCanvasSize]);

  const handleZoomOut = useCallback(() => {
    const { width, height } = getCanvasSize();
    zoomAt(width / 2, height / 2, viewState.scale / SCALE_STEP);
  }, [viewState.scale, zoomAt, getCanvasSize]);

  const handleResetView = useCallback(() => {
    if (currentProvinceId) {
      const province = provinces.find(p => p.id === currentProvinceId);
      if (province) {
        fitToProvince(province);
      }
    } else {
      fitToCountry();
    }
  }, [currentProvinceId, provinces]);

  const fitToCountry = useCallback(() => {
    const { width, height } = getCanvasSize();
    const allX = provinces.flatMap(p => p.outline.map(pt => pt.x));
    const allY = provinces.flatMap(p => p.outline.map(pt => pt.y));
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    const scaleX = (width - 80) / mapWidth;
    const scaleY = (height - 80) / mapHeight;
    const scale = Math.min(scaleX, scaleY);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setViewState({
      scale,
      offsetX: -centerX * scale,
      offsetY: -centerY * scale
    });
  }, [provinces, getCanvasSize]);

  const fitToProvince = useCallback((province: Province) => {
    const { width, height } = getCanvasSize();
    const bounds = getProvinceBounds(province);
    const mapWidth = bounds.maxX - bounds.minX;
    const mapHeight = bounds.maxY - bounds.minY;

    const scaleX = (width - 80) / mapWidth;
    const scaleY = (height - 80) / mapHeight;
    const scale = Math.min(scaleX, scaleY);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setViewState({
      scale,
      offsetX: -centerX * scale,
      offsetY: -centerY * scale
    });
  }, [getCanvasSize]);

  useEffect(() => {
    if (currentProvinceId) {
      const province = provinces.find(p => p.id === currentProvinceId);
      if (province) {
        setTimeout(() => fitToProvince(province), 50);
      }
    } else {
      setTimeout(() => fitToCountry(), 50);
    }
  }, [currentProvinceId]);

  useEffect(() => {
    requestRender();
  });

  useEffect(() => {
    const handleResize = () => requestRender();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [requestRender]);

  return (
    <div className="map-container" ref={containerRef}>
      <div className="map-breadcrumb">
        <span className="breadcrumb-link" onClick={onBackToCountry}>
          全国
        </span>
        {currentProvince && (
          <>
            <span className="breadcrumb-sep">/</span>
            <span>{currentProvince.name}</span>
          </>
        )}
      </div>

      {currentProvinceId && onAddClick && (
        <button
          className={`add-btn ${isAddMode ? 'active' : ''}`}
          onClick={onAddClick}
          title={isAddMode ? '取消' : '添加打卡'}
        >
          +
        </button>
      )}

      <div className="map-controls">
        <button className="map-ctrl-btn" onClick={handleZoomIn} title="放大">+</button>
        <button className="map-ctrl-btn" onClick={handleZoomOut} title="缩小">−</button>
        <button className="map-ctrl-btn" onClick={handleResetView} title="重置">⌂</button>
      </div>

      <canvas
        ref={canvasRef}
        className="map-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {hoveredPin && (
        <div
          className="pin-tooltip"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 10,
            position: 'fixed'
          }}
        >
          <div className="pin-tooltip-name">{hoveredPin.restaurantName}</div>
          <div className="pin-tooltip-rating">
            {[1, 2, 3, 4, 5].map(i => (
              <span
                key={i}
                className="star filled"
                style={{ fontSize: '14px', color: i <= hoveredPin.rating ? '#F1C40F' : '#D5D8DC' }}
              >
                ★
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
