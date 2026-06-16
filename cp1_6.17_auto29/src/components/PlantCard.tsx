import React, { useState } from 'react';
import { Plant, getCategoryColor } from '../plantManager';

interface PlantCardProps {
  plant: Plant;
  onDelete: (id: string) => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const color = getCategoryColor(plant.species as never);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '1px 1px 4px #E0E0E0',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#2E3B2E' }}>
              {plant.name}
            </div>
            <div style={{ fontSize: 12, color: '#7B8B6F', marginTop: 2 }}>
              {plant.species} · {plant.location}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              background: '#C8E6C9',
              color: '#2E7D32',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            每{plant.wateringFrequency}天浇水
          </span>
          <span
            style={{
              transition: 'transform 0.3s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              fontSize: 14,
              color: '#999',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      <div
        style={{
          maxHeight: expanded ? 300 : 0,
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.3s ease, transform 0.3s ease',
          transform: expanded ? 'scaleY(1)' : 'scaleY(0)',
          transformOrigin: 'top',
        }}
      >
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid #E8E8E8' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 12,
              fontSize: 13,
              color: '#555',
            }}
          >
            <div>
              <span style={{ color: '#999' }}>盆器材质：</span>
              {plant.potMaterial}
            </div>
            <div>
              <span style={{ color: '#999' }}>湿度偏好：</span>
              {plant.moisturePreference}
            </div>
            <div>
              <span style={{ color: '#999' }}>光照等级：</span>
              {plant.lightLevel} Lux
            </div>
            <div>
              <span style={{ color: '#999' }}>创建日期：</span>
              {plant.createdAt.slice(0, 10)}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <span style={{ color: '#999', fontSize: 13 }}>光照强度</span>
            <div
              style={{
                marginTop: 4,
                height: 8,
                background: '#EEE',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (plant.lightLevel / 800) * 100)}%`,
                  background: `linear-gradient(90deg, #81C784, ${color})`,
                  borderRadius: 4,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#AAA',
                marginTop: 2,
              }}
            >
              <span>0 Lux</span>
              <span>800 Lux</span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(plant.id);
            }}
            style={{
              marginTop: 12,
              background: 'none',
              border: '1px solid #E0E0E0',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              color: '#E57373',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#FFEBEE';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'none';
            }}
          >
            删除档案
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlantCard;
