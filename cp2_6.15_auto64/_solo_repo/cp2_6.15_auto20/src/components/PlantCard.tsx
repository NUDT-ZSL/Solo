import React, { useState, useMemo, useEffect } from 'react';
import type { Plant } from '@/types';
import { getPlantType, getStageName } from '@/types';

interface PlantCardProps {
  plant: Plant;
  onWater?: () => void;
  onFertilize?: () => void;
  onHarvest?: () => void;
  onClick?: () => void;
}

const PlantCard: React.FC<PlantCardProps> = React.memo(({
  plant,
  onWater,
  onFertilize,
  onHarvest,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const [showWater, setShowWater] = useState(false);
  const [showFertilize, setShowFertilize] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.body.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains('dark'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const pt = useMemo(() => getPlantType(plant.plantType), [plant.plantType]);
  const isMature = plant.growthProgress >= 100;

  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';

  const handleWater = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowWater(true);
    onWater?.();
    setTimeout(() => setShowWater(false), 500);
  };

  const handleFertilize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFertilize(true);
    onFertilize?.();
    setTimeout(() => setShowFertilize(false), 800);
  };

  const getSprite = () => {
    if (plant.stage <= 0) return '🌱';
    if (plant.stage === 1) return '🌿';
    return pt.emoji;
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '180px',
        height: '220px',
        borderRadius: '12px',
        background: cardBackground,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'visible',
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.08)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.3s ease',
      }}
    >
      {isMature && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '3px 8px',
            background: 'var(--accent-gold)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '8px',
            animation: 'blink 0.5s infinite',
          }}
        >
          已成熟
        </div>
      )}

      <div style={{ fontSize: '48px', marginTop: '8px' }}>{getSprite()}</div>

      <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
        {pt.name}
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
        {getStageName(plant.stage)} · Lv.{plant.stage + 1}
      </div>

      <div
        style={{
          width: '80%',
          height: '12px',
          background: 'var(--progress-bg)',
          borderRadius: '6px',
          overflow: 'hidden',
          marginTop: '8px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${plant.growthProgress}%`,
            background: `linear-gradient(90deg, #4caf50, #ffc107)`,
            transition: 'width 0.3s ease',
            borderRadius: '6px',
          }}
        />
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '3px' }}>
        成熟度 {plant.growthProgress}%
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', position: 'relative', width: '100%', justifyContent: 'center' }}>
        {!isMature ? (
          <>
            <button
              onClick={handleWater}
              style={{
                padding: '5px 12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4d96ff, #6bc5ff)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              💧 浇水
            </button>
            <button
              onClick={handleFertilize}
              style={{
                padding: '5px 12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6bcb77, #8ddf8d)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              🌿 施肥
            </button>

            {showWater && (
              <>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      left: `${20 + i * 15}%`,
                      fontSize: '16px',
                      animation: 'waterDrop 0.5s ease-out forwards',
                      animationDelay: `${i * 0.1}s`,
                      pointerEvents: 'none',
                    }}
                  >
                    💧
                  </span>
                ))}
              </>
            )}
            {showFertilize && (
              <>
                {[0, 1, 2, 3, 4].map(i => (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      bottom: '-5px',
                      left: `${50 + (i - 2) * 12}%`,
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6bcb77',
                      animation: 'fertilizeRise 0.8s ease-out forwards',
                      animationDelay: `${i * 0.08}s`,
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onHarvest?.(); }}
            style={{
              padding: '6px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ffd700, #ffb700)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            ✨ 收获
          </button>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '10px',
          fontSize: '10px',
          color: plant.health > 50 ? 'var(--accent-green)' : 'var(--accent-pink)',
        }}
      >
        ❤️ {plant.health}
      </div>
    </div>
  );
});

PlantCard.displayName = 'PlantCard';

export default PlantCard;
