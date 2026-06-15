import React, { useState, useCallback, memo, useMemo } from 'react';
import type { Plant } from '../types';
import { getPlantGradient, getDaysUntilWatering, getWateringStatusColor } from '../types';
import { getPlantIcon } from './icons';

interface PlantCardProps {
  plant: Plant;
  onClick: (plant: Plant) => void;
  onWater?: (plant: Plant) => void;
}

const PlantCard: React.FC<PlantCardProps> = memo(function PlantCard({ plant, onClick, onWater }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const gradient = useMemo(() => getPlantGradient(plant.type), [plant.type]);
  const daysUntil = useMemo(() => getDaysUntilWatering(plant), [plant]);
  const statusColor = useMemo(() => getWateringStatusColor(daysUntil), [daysUntil]);
  const PlantIconComponent = useMemo(() => getPlantIcon(plant.type), [plant.type]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      onClick(plant);
    }, 300);
  }, [plant, onClick]);

  const handleWaterClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWater) {
      onWater(plant);
    }
  }, [plant, onWater]);

  const daysText = useMemo(() => {
    if (daysUntil < 0) return `已超期${Math.abs(Math.floor(daysUntil))}天`;
    if (daysUntil < 1) return '今天需要浇水';
    if (daysUntil < 2) return '明天需要浇水';
    return `${Math.floor(daysUntil)}天后浇水`;
  }, [daysUntil]);

  return (
    <div
      onClick={handleClick}
      style={{
        width: 280,
        height: 360,
        background: '#f0fdf4',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(34,197,94,0.1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(34,197,94,0.15)';
      }}
      onMouseLeave={(e) => {
        if (!isAnimating) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(34,197,94,0.1)';
        }
      }}
    >
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 8,
        }}
      >
        <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
          {plant.type}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <PlantIconComponent size={75} />
      </div>

      <div style={{ padding: '0 20px 16px 20px' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 12, textAlign: 'center' }}>
          {plant.name}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#ffffff',
            borderRadius: 10,
            border: `1px solid ${statusColor}20`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColor,
              }}
            />
            <span style={{ fontSize: 13, color: '#4b5563' }}>{daysText}</span>
          </div>
          <button
            onClick={handleWaterClick}
            style={{
              padding: '4px 10px',
              background: statusColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            浇水
          </button>
        </div>
      </div>

      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            marginLeft: -5,
            marginTop: -5,
            background: 'rgba(34,197,94,0.3)',
            borderRadius: '50%',
            pointerEvents: 'none',
            animation: 'ripple 0.6s ease-out forwards',
          }}
        />
      ))}
    </div>
  );
});

export default PlantCard;
