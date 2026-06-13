import React from 'react';
import type { Room } from '../types';

interface RoomCardProps {
  room: Room;
  onBook: (room: Room) => void;
  isLoading?: boolean;
}

const getRoomImageGradient = (type: string) => {
  const gradients: Record<string, string> = {
    standard: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
    deluxe: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    suite: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)',
  };
  return gradients[type] || gradients.standard;
};

const getRoomEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    standard: '🏠',
    deluxe: '🏡',
    suite: '🏰',
  };
  return emojis[type] || '🏠';
};

const RoomCard: React.FC<RoomCardProps> = ({ room, onBook, isLoading }) => {
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const currentPrice = isWeekend ? room.weekendPrice : room.weekdayPrice;

  if (isLoading) {
    return (
      <div className="room-card skeleton" style={{
        width: '320px',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <div style={{ height: '200px', background: 'var(--color-gray-200)' }} />
        <div style={{ padding: '24px' }}>
          <div style={{ height: '24px', width: '60%', background: 'var(--color-gray-200)', borderRadius: '4px', marginBottom: '12px' }} />
          <div style={{ height: '16px', width: '80%', background: 'var(--color-gray-200)', borderRadius: '4px', marginBottom: '16px' }} />
          <div style={{ height: '32px', width: '40%', background: 'var(--color-gray-200)', borderRadius: '4px', marginBottom: '16px' }} />
          <div style={{ height: '40px', width: '100%', background: 'var(--color-gray-200)', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="room-card card fade-in"
      style={{
        width: '320px',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div
        style={{
          height: '200px',
          background: getRoomImageGradient(room.type),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '5rem',
          position: 'relative',
        }}
      >
        <span role="img" aria-label={room.name}>
          {getRoomEmoji(room.type)}
        </span>
        {isWeekend && (
          <span
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'var(--color-warning)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: '500',
            }}
          >
            周末价
          </span>
        )}
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            {room.name}
          </h3>
          <span
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-light)',
              background: 'var(--color-bg-alt)',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            {room.area}㎡
          </span>
        </div>

        <p
          style={{
            color: 'var(--color-text-light)',
            fontSize: '0.95rem',
            marginBottom: '16px',
            lineHeight: '1.5',
          }}
        >
          {room.description}
        </p>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-primary)' }}>
              ¥{currentPrice}
            </span>
            <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
              /晚
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
            平日 ¥{room.weekdayPrice} · 周末 ¥{room.weekendPrice}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => onBook(room)}
        >
          立即预订
        </button>
      </div>
    </div>
  );
};

export default RoomCard;
