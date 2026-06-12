import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { planetData, PlanetData } from '@/astronomy/planetData';

interface ControlPanelProps {
  speedMultiplier: number;
  onSpeedChange: (speed: number) => void;
  isPaused: boolean;
  onPauseToggle: () => void;
  onPlanetSelect: (planet: PlanetData) => void;
  onResetView: () => void;
  focusedPlanetId: string | null;
}

export default function ControlPanel({
  speedMultiplier,
  onSpeedChange,
  isPaused,
  onPauseToggle,
  onPlanetSelect,
  onResetView,
  focusedPlanetId,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const value = Math.round(1 + percentage * 9);
      onSpeedChange(value);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onSpeedChange]);

  return (
    <motion.div
      initial={false}
      animate={{ x: isCollapsed ? -180 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      <motion.div
        style={{
          width: 200,
          padding: 12,
          borderRadius: 12,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(136, 204, 255, 0.3)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        whileHover={{
          boxShadow: '0 0 20px rgba(136, 204, 255, 0.2)',
        }}
      >
        <div style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          marginBottom: 12,
          color: '#88ccff',
          letterSpacing: 0.5,
          '@media (max-width: 768px)': {
            fontSize: 12,
            padding: 8,
          } as any
        }}>
          太阳系导览
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            行星列表
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {planetData.map((planet) => (
              <motion.div
                key={planet.id}
                onClick={() => onPlanetSelect(planet)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  backgroundColor: focusedPlanetId === planet.id 
                    ? 'rgba(136, 204, 255, 0.2)' 
                    : 'transparent',
                  border: focusedPlanetId === planet.id 
                    ? '1px solid rgba(136, 204, 255, 0.5)' 
                    : '1px solid transparent',
                  fontSize: 12,
                  transition: 'all 0.15s ease',
                  '@media (max-width: 768px)': {
                    fontSize: 11,
                    padding: '6px 8px',
                  } as any
                }}
                whileHover={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: planet.color,
                    boxShadow: planet.id === 'sun' 
                      ? `0 0 8px ${planet.color}` 
                      : 'none',
                  }}
                />
                <span style={{ flex: 1 }}>{planet.nameCN}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            公转速度: {speedMultiplier}x
          </div>
          <div
            style={{
              position: 'relative',
              height: 20,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onMouseDown={(e) => {
              setIsDragging(true);
              handleSliderChange(e);
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                height: 4,
                borderRadius: 2,
                backgroundColor: '#88ccff',
                width: `${((speedMultiplier - 1) / 9) * 100}%`,
                boxShadow: '0 0 10px rgba(136, 204, 255, 0.5)',
              }}
            />
            <motion.div
              style={{
                position: 'absolute',
                width: isDragging ? 20 : 16,
                height: isDragging ? 20 : 16,
                borderRadius: '50%',
                backgroundColor: 'white',
                left: `calc(${((speedMultiplier - 1) / 9) * 100}% - ${isDragging ? 10 : 8}px)`,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
              animate={{
                width: isDragging ? 20 : 16,
                height: isDragging ? 20 : 16,
                left: `calc(${((speedMultiplier - 1) / 9) * 100}% - ${isDragging ? 10 : 8}px)`,
              }}
              transition={{ duration: 0.15 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            <span>1x</span>
            <span>10x</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <motion.button
            onClick={onPauseToggle}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(136, 204, 255, 0.4)',
              backgroundColor: 'rgba(136, 204, 255, 0.1)',
              color: 'white',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
            whileHover={{
              backgroundColor: 'rgba(136, 204, 255, 0.2)',
              borderColor: 'rgba(136, 204, 255, 0.6)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              animate={{ rotate: isPaused ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 14 }}
            >
              {isPaused ? '▶' : '⏸'}
            </motion.span>
            {isPaused ? '播放' : '暂停'}
          </motion.button>

          <motion.button
            onClick={onResetView}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
            whileHover={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.4)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span>⟲</span>
            重置
          </motion.button>
        </div>

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          拖拽旋转 · 滚轮缩放 · 点击行星查看详情
        </div>
      </motion.div>

      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          width: 28,
          height: 40,
          marginLeft: 4,
          borderRadius: '0 8px 8px 0',
          border: '1px solid rgba(136, 204, 255, 0.3)',
          borderLeft: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#88ccff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          marginTop: 20,
        }}
        whileHover={{
          backgroundColor: 'rgba(136, 204, 255, 0.1)',
        }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          ◀
        </motion.span>
      </motion.button>
    </motion.div>
  );
}

function handleSliderChange(e: React.MouseEvent<HTMLDivElement>) {
  const slider = e.currentTarget;
  const rect = slider.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percentage = Math.max(0, Math.min(1, x / rect.width));
  const value = Math.round(1 + percentage * 9);
  const event = new CustomEvent('sliderChange', { detail: value });
  window.dispatchEvent(event);
}

export function useSliderListener(callback: (value: number) => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('sliderChange', ((e: CustomEvent) => {
      callback(e.detail);
    }) as EventListener);
  }
}
