import React, { useState } from 'react';
import { shiftHue } from '../utils/colorExtractor';

interface ColorCardProps {
  hex: string;
  percentage: number;
  locked: boolean;
  hueShift: number;
  index: number;
  onLockToggle: () => void;
  onHueShift: (value: number) => void;
}

const ColorCard: React.FC<ColorCardProps> = ({
  hex,
  percentage,
  locked,
  hueShift,
  index,
  onLockToggle,
  onHueShift,
}) => {
  const [copied, setCopied] = useState(false);
  const displayHex = shiftHue(hex, hueShift);

  const handleCopyColor = () => {
    navigator.clipboard.writeText(displayHex.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const textColor = isLightColor(displayHex) ? '#222' : '#fff';

  return (
    <div
      className="color-card"
      style={{
        width: '130px',
        height: '160px',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
      }}
    >
      <div
        style={{
          height: '110px',
          backgroundColor: displayHex,
          position: 'relative',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
        onClick={handleCopyColor}
      >
        {copied && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            已复制
          </div>
        )}
      </div>

      <div
        style={{
          height: '50px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '2px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#222',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {displayHex.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#888',
          }}
        >
          {percentage.toFixed(1)}%
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '55px',
          right: '8px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLockToggle();
          }}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: locked ? 'rgba(108, 99, 255, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            color: locked ? '#fff' : '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          }}
          title={locked ? '解锁' : '锁定'}
        >
          {locked ? '🔒' : '🔓'}
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '55px',
          left: '8px',
          right: '44px',
        }}
      >
        <input
          type="range"
          min="-15"
          max="15"
          step="1"
          value={hueShift}
          onChange={(e) => onHueShift(parseInt(e.target.value))}
          disabled={locked}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: locked ? '#ddd' : `linear-gradient(to right, ${shiftHue(hex, -15)}, ${hex}, ${shiftHue(hex, 15)})`,
            appearance: 'none',
            cursor: locked ? 'not-allowed' : 'pointer',
            outline: 'none',
            opacity: locked ? 0.5 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>
    </div>
  );
};

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

export default ColorCard;
