import { useState, useRef, useEffect, useCallback } from 'react';
import type { PlanetDetail } from './ApiClient';
import './UIPanel.css';

interface UIPanelProps {
  planet: PlanetDetail | null;
  onClose: () => void;
}

export function UIPanel({ planet, onClose }: UIPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [panelHeight, setPanelHeight] = useState('40%');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartTop = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startHeight = useRef(0);
  const startY = useRef(0);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (planet) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [planet]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current && isMobile) {
      const deltaY = startY.current - e.clientY;
      const newHeight = startHeight.current + deltaY;
      const minHeight = window.innerHeight * 0.2;
      const maxHeight = window.innerHeight * 0.8;
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setPanelHeight(`${clampedHeight}px`);
      return;
    }

    if (!isDragging || isMobile) return;

    const deltaY = e.clientY - dragStartPos.current.y;
    const newTop = dragStartTop.current + deltaY;
    const maxTop = window.innerHeight - 100;
    const clampedTop = Math.max(0, Math.min(maxTop, newTop));

    setPanelStyle(prev => ({
      ...prev,
      top: `${clampedTop}px`,
      bottom: 'auto',
    }));
  }, [isDragging, isMobile]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    isResizing.current = false;
  }, []);

  useEffect(() => {
    if (isDragging || isResizing.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    if ((e.target as HTMLElement).closest('.close-button')) return;

    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const rect = panelRef.current.getBoundingClientRect();
    dragStartTop.current = rect.top;

    e.preventDefault();
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isMobile) return;
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = panelRef.current?.offsetHeight || 0;
    e.preventDefault();
  }, [isMobile]);

  if (!isVisible && !planet) return null;

  const baseStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: panelHeight,
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
        transform: planet ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
      }
    : {
        position: 'fixed',
        top: '50px',
        right: '20px',
        width: '300px',
        borderRadius: '12px 0 12px 12px',
        transform: planet ? 'translateX(0)' : 'translateX(320px)',
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
        opacity: planet ? 1 : 0,
      };

  const infoItems = planet
    ? [
        { label: '类型', value: planet.type },
        { label: '质量', value: planet.mass },
        { label: '半径', value: `${planet.radius.toLocaleString()} km` },
        { label: '公转周期', value: planet.orbitPeriod },
        { label: '平均温度', value: planet.avgTemperature },
        { label: '重力加速度', value: planet.gravity },
        { label: '自转周期', value: planet.dayLength },
        { label: '卫星数量', value: String(planet.moons) },
        { label: '发现者', value: planet.discoveredBy },
        { label: '发现日期', value: planet.discoveryDate },
      ]
    : [];

  return (
    <div
      ref={panelRef}
      className="ui-panel"
      style={{
        ...baseStyle,
        ...panelStyle,
      }}
      onMouseDown={handleMouseDown}
    >
      {isMobile && (
        <div
          className="resize-handle"
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '6px',
            backgroundColor: '#555',
            borderRadius: '3px',
            marginTop: '8px',
            cursor: 'row-resize',
            zIndex: 10,
          }}
          onMouseDown={handleResizeStart}
        />
      )}

      <button
        ref={closeBtnRef}
        className="close-button"
        onClick={onClose}
      >
        ×
      </button>

      {planet && (
        <>
          <h2 className="panel-title">
            {planet.name}
          </h2>

          <p className="panel-type">
            {planet.type}
          </p>

          <div className="panel-divider" />

          <p className="panel-description">
            {planet.description}
          </p>

          <div className="panel-divider" />

          <div className="panel-info-list">
            {infoItems.map((item) => (
              <div key={item.label} className="panel-info-item">
                <span className="panel-info-label">{item.label}</span>
                <span className="panel-info-value">{item.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
