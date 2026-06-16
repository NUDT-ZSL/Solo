import React, { forwardRef } from 'react';
import { Droplets, Leaf } from 'lucide-react';
import type { Plant } from '../types';
import { daysUntilNextCare } from '../utils';

interface PlantCardProps {
  plant: Plant;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  onWater: () => void;
  onFertilize: () => void;
}

const PlantCard = forwardRef<HTMLDivElement, PlantCardProps>(
  ({ plant, isSelected, isHighlighted, onClick, onWater, onFertilize }, ref) => {
    const daysToWater = daysUntilNextCare(plant.lastWaterTime, plant.waterInterval);
    const isOverdue = daysToWater <= 0;

    const cardStyle: React.CSSProperties = {
      width: '280px',
      height: '100px',
      borderRadius: '12px',
      padding: '12px',
      backgroundColor: isSelected ? '#dcfce7' : '#f9fafb',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease',
      border: isHighlighted ? '2px solid #16a34a' : '2px solid transparent',
      position: 'relative',
      overflow: 'hidden',
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    };

    const nameStyle: React.CSSProperties = {
      fontSize: '16px',
      fontWeight: 600,
      color: '#1f2937',
      margin: 0,
    };

    const varietyStyle: React.CSSProperties = {
      fontSize: '13px',
      color: '#6b7280',
      margin: 0,
    };

    const countdownStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: isOverdue ? '#fef2f2' : '#e0f2fe',
      color: isOverdue ? '#dc2626' : '#0369a1',
      minWidth: '60px',
    };

    const footerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
    };

    const buttonStyle: React.CSSProperties = {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    };

    const waterButtonStyle: React.CSSProperties = {
      ...buttonStyle,
      backgroundColor: '#dbeafe',
      color: '#3b82f6',
    };

    const fertilizeButtonStyle: React.CSSProperties = {
      ...buttonStyle,
      backgroundColor: '#dcfce7',
      color: '#22c55e',
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1.1)';
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1)';
    };

    const handleCardMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSelected) {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
      }
    };

    const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.transform = 'translateX(0)';
      e.currentTarget.style.boxShadow = 'none';
    };

    return (
      <div
        ref={ref}
        style={cardStyle}
        className={isHighlighted ? 'plant-card-highlight' : ''}
        onClick={onClick}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        data-plant-id={plant.id}
      >
        <div style={headerStyle}>
          <div>
            <h3 style={nameStyle}>{plant.name}</h3>
            <p style={varietyStyle}>{plant.variety}</p>
          </div>
          <span style={countdownStyle}>
            {isOverdue ? `逾期${Math.abs(daysToWater)}天` : `${daysToWater}天后浇水`}
          </span>
        </div>
        <div style={footerStyle}>
          <button
            style={waterButtonStyle}
            onClick={(e) => {
              e.stopPropagation();
              onWater();
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            title="浇水"
          >
            <Droplets size={18} />
          </button>
          <button
            style={fertilizeButtonStyle}
            onClick={(e) => {
              e.stopPropagation();
              onFertilize();
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            title="施肥"
          >
            <Leaf size={18} />
          </button>
        </div>
      </div>
    );
  },
);

PlantCard.displayName = 'PlantCard';

export default PlantCard;
