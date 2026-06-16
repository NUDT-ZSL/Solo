import { useState } from 'react';
import { Building } from '../data/buildings';

type TimeSlot = 'morning' | 'noon' | 'dusk' | 'night';

interface BuildingCardProps {
  building: Building;
  unlockedSlots: TimeSlot[];
  onClick: () => void;
}

const TIME_SLOT_COLORS: Record<TimeSlot, string> = {
  morning: '#FFD700',
  noon: '#FFFFFF',
  dusk: '#FF6347',
  night: '#4169E1'
};

const TIME_SLOTS: TimeSlot[] = ['morning', 'noon', 'dusk', 'night'];

function BuildingCard({ building, unlockedSlots, onClick }: BuildingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isFullyUnlocked = unlockedSlots.length === 4;
  const latestUnlockedSlot = unlockedSlots[unlockedSlots.length - 1];
  const shadowColor = latestUnlockedSlot ? TIME_SLOT_COLORS[latestUnlockedSlot] : 'rgba(0,0,0,0.3)';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '320px',
        borderRadius: '20px',
        backgroundColor: '#1A1A2E',
        border: '1px solid #4A4A6A',
        padding: '24px',
        cursor: 'pointer',
        position: 'relative',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease-out, border-color 0.4s ease-out',
        boxShadow: isHovered 
          ? '0 12px 8px rgba(0, 0, 0, 0.5)' 
          : '0 4px 4px rgba(0, 0, 0, 0.3)',
        animation: isFullyUnlocked ? 'goldenGlow 1.5s ease-in-out infinite' : 'none',
        overflow: 'visible'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '-4px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '4px',
        zIndex: 10
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              transform: isHovered && unlockedSlots.includes(slot) ? 'scale(1.2)' : 'scale(1)',
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none',
              boxShadow: unlockedSlots.includes(slot) && isHovered
                ? `0 0 8px ${TIME_SLOT_COLORS[slot]}` 
                : 'none'
            }}
          />
        ))}
      </div>

      <div style={{
        width: '100%',
        height: '240px',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0D0D1A',
        marginBottom: '20px'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="280" height="220" viewBox="0 0 320 260" style={{ overflow: 'visible' }}>
            <defs>
              <filter id={`shadow-${building.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow 
                  dx="8" 
                  dy="12" 
                  stdDeviation="4" 
                  floodColor={shadowColor}
                  floodOpacity={isFullyUnlocked ? 0.6 : 0.3}
                />
              </filter>
            </defs>
            <path
              d={building.shadePath}
              fill="#2A2A4A"
              stroke="#5A5A8A"
              strokeWidth="1"
              style={{
                transition: 'all 0.4s ease-out',
                filter: `url(#shadow-${building.id})`
              }}
            />
            <path
              d={building.shadePath}
              fill="transparent"
              stroke={shadowColor}
              strokeWidth="0.5"
              opacity={isFullyUnlocked ? 0.8 : 0.2}
              style={{
                transform: 'translate(2px, 2px)',
                transition: 'all 0.4s ease-out'
              }}
            />
          </svg>
        </div>
        
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '100px',
          backdropFilter: 'blur(4px)'
        }}>
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#444',
                transition: 'all 0.4s ease-out',
                opacity: unlockedSlots.includes(slot) ? 1 : 0.3,
                boxShadow: unlockedSlots.includes(slot) 
                  ? `0 0 4px ${TIME_SLOT_COLORS[slot]}` 
                  : 'none'
              }}
            />
          ))}
        </div>
      </div>

      <div style={{
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#FFFFFF',
          marginBottom: '8px',
          transition: 'color 0.4s ease-out',
          letterSpacing: '0.5px'
        }}>
          {building.name}
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#8888AA',
          transition: 'color 0.4s ease-out'
        }}>
          {building.city}
        </p>
      </div>

      <div style={{
        position: 'absolute',
        right: '-4px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none'
            }}
          />
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '-4px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '4px'
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none'
            }}
          />
        ))}
      </div>

      <div style={{
        position: 'absolute',
        left: '-4px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none'
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default BuildingCard;
