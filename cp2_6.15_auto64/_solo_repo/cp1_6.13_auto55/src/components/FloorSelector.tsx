import { useState, useRef } from 'react';

const FLOOR_LABELS = ['B1-L1', 'L1-L2', 'L2-L3', 'L3-L4'];

export default function FloorSelector({
  currentFloor,
  onFloorChange,
}: {
  currentFloor: number;
  onFloorChange: (floor: number) => void;
}) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (floor: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (floor === currentFloor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newRipple = {
      id: Date.now(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
    onFloorChange(floor);
  };

  return (
    <div
      ref={containerRef}
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'linear-gradient(to top, rgba(15,23,42,0.95), rgba(30,41,59,0.8))',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(71,85,105,0.3)',
        padding: '0 24px',
        position: 'relative',
        zIndex: 40,
      }}
    >
      {FLOOR_LABELS.map((label, index) => {
        const floor = index + 1;
        const isActive = currentFloor === floor;
        return (
          <button
            key={label}
            onClick={(e) => handleClick(floor, e)}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              background: isActive ? '#ffffff' : 'rgba(255,255,255,0.12)',
              color: isActive ? '#1f2937' : '#9ca3af',
              fontSize: 11,
              fontWeight: isActive ? 700 : 400,
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              boxShadow: isActive
                ? '0 0 20px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.2)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {ripples
              .filter((r) => r.id !== undefined)
              .map((ripple) => (
                <span
                  key={ripple.id}
                  style={{
                    position: 'absolute',
                    left: ripple.x - 10,
                    top: ripple.y - 10,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.4)',
                    transform: 'scale(0)',
                    animation: 'ripple 0.6s ease-out',
                    pointerEvents: 'none',
                  }}
                />
              ))}
            {label}
          </button>
        );
      })}
    </div>
  );
}
