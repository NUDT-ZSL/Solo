import { useState, useRef, useEffect, useCallback } from 'react';
import type { PlanetDetail } from './ApiClient';

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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;

    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const rect = panelRef.current.getBoundingClientRect();
    dragStartTop.current = rect.top;

    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      isResizing.current = false;
    };

    if (isDragging || isResizing.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMobile]);

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!isMobile) return;
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = panelRef.current?.offsetHeight || 0;
    e.preventDefault();
  };

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
        backgroundColor: 'rgba(30, 30, 40, 0.92)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        padding: '20px',
        zIndex: 1000,
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        userSelect: 'none',
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
          }}
          onMouseDown={handleResizeStart}
        />
      )}

      <button
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '20px',
          cursor: 'pointer',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.2s, background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#e74c3c';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#fff';
        }}
        onClick={onClose}
      >
        ×
      </button>

      {planet && (
        <>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              margin: 0,
              marginBottom: '4px',
              color: '#fff',
              paddingRight: '30px',
            }}
          >
            {planet.name}
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: '#a0a0a0',
              margin: 0,
              marginBottom: '12px',
            }}
          >
            {planet.type}
          </p>

          <div
            style={{
              height: '1px',
              backgroundColor: '#444',
              marginBottom: '12px',
            }}
          />

          <p
            style={{
              fontSize: '13px',
              color: '#bbb',
              lineHeight: '1.6',
              margin: 0,
              marginBottom: '16px',
            }}
          >
            {planet.description}
          </p>

          <div
            style={{
              height: '1px',
              backgroundColor: '#444',
              marginBottom: '12px',
            }}
          />

          <div>
            {infoItems.map((item, index) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  lineHeight: '28px',
                }}
              >
                <span style={{ color: '#888' }}>{item.label}</span>
                <span style={{ color: '#fff' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
