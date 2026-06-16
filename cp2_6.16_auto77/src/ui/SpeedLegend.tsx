import { useState, useEffect } from 'react';

export default function SpeedLegend() {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [dimensions, setDimensions] = useState({ width: 160, height: 12 });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setDimensions({ width: 120, height: 8 });
      } else {
        setDimensions({ width: 160, height: 12 });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSpeedFromPosition = (x: number, rect: DOMRect): string => {
    const percentage = (x - rect.left) / rect.width;
    const speed = 0.2 + percentage * 2.3;
    return speed.toFixed(2);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 100,
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          color: '#ffffff',
          fontSize: dimensions.height > 10 ? '12px' : '10px',
          opacity: 0.9,
        }}
      >
        <span style={{ color: '#00d4ff', fontWeight: 500 }}>慢速</span>
        <span style={{ color: '#ff6b35', fontWeight: 500, fontSize: '11px' }}>
          流速 (m/s)
        </span>
        <span style={{ color: '#e63946', fontWeight: 500 }}>快速</span>
      </div>

      <div
        style={{
          position: 'relative',
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #00d4ff 0%, #ff6b35 50%, #e63946 100%)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setHoverPosition(null);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverPosition(e.clientX - rect.left);
          setHoverRect(rect);
        }}
      >
        {isHovered && hoverPosition !== null && (
          <div
            style={{
              position: 'absolute',
              top: `-${dimensions.height + 24}px`,
              left: `${hoverPosition}px`,
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            {hoverRect && getSpeedFromPosition(hoverPosition, hoverRect)}{' '}
            m/s
          </div>
        )}

        {isHovered && hoverPosition !== null && (
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: `${hoverPosition}px`,
              width: '2px',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.8)',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
            }}
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '6px',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: dimensions.height > 10 ? '10px' : '8px',
        }}
      >
        <span>0.2</span>
        <span>2.5</span>
      </div>
    </div>
  );
}
