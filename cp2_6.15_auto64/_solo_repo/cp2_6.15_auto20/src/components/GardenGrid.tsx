import React, { useMemo, useState, useEffect } from 'react';
import type { Plant } from '@/types';
import { getPlantType } from '@/types';

interface GardenGridProps {
  plants: Plant[];
  gridSize?: number;
  onCellClick?: (index: number, plant?: Plant) => void;
  readOnly?: boolean;
}

const GardenGrid: React.FC<GardenGridProps> = React.memo(({
  plants,
  gridSize: externalGridSize,
  onCellClick,
  readOnly = false,
}) => {
  const [internalGridSize, setInternalGridSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 320 ? 5 : 6;
    }
    return 6;
  });

  const gridSize = externalGridSize || internalGridSize;

  useEffect(() => {
    if (externalGridSize) return;

    const handleResize = () => {
      setInternalGridSize(window.innerWidth <= 320 ? 5 : 6);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [externalGridSize]);

  const plantMap = useMemo(() => {
    const map = new Map<number, Plant>();
    plants.forEach(p => map.set(p.gridIndex, p));
    return map;
  }, [plants]);

  const cells = useMemo(() => {
    return Array.from({ length: gridSize * gridSize }, (_, i) => i);
  }, [gridSize]);

  const getStageSprite = (plantType: string, stage: number) => {
    const pt = getPlantType(plantType);
    if (stage <= 0) return '🌱';
    if (stage === 1) return '🌿';
    return pt.emoji;
  };

  return (
    <div
      className="garden-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gap: '4px',
        padding: '12px',
        background: 'var(--grid-bg)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: gridSize === 5 ? '320px' : gridSize === 6 ? '400px' : '540px',
        aspectRatio: '1 / 1',
      }}
    >
      {cells.map(index => {
        const plant = plantMap.get(index);
        const pt = plant ? getPlantType(plant.plantType) : null;
        const sprite = plant ? getStageSprite(plant.plantType, plant.stage) : null;

        return (
          <div
            key={index}
            onClick={() => !readOnly && onCellClick?.(index, plant)}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '6px',
              background: plant ? pt!.color + '30' : 'var(--empty-bg)',
              border: plant ? `1px solid ${pt!.color}80` : '1px dashed var(--empty-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: readOnly ? 'default' : (plant ? 'pointer' : 'pointer'),
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!readOnly) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
          >
            {plant && sprite ? (
              <>
                <span style={{ fontSize: gridSize === 5 ? '16px' : gridSize === 6 ? '18px' : '22px' }}>{sprite}</span>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    left: '3px',
                    right: '3px',
                    height: '4px',
                    background: 'var(--progress-bg)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${plant.growthProgress}%`,
                      background: `linear-gradient(90deg, #4caf50, #ffc107)`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </>
            ) : (
              !readOnly && (
                <span style={{ color: 'var(--empty-border)', fontSize: '14px', fontWeight: 'bold' }}>+</span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
});

GardenGrid.displayName = 'GardenGrid';

export default GardenGrid;
