import React from 'react';

interface AvatarProps {
  initial: string;
  color: string;
  size?: number;
  medalColor?: string;
  scale?: number;
}

const Avatar: React.FC<AvatarProps> = ({
  initial,
  color,
  size = 48,
  medalColor,
  scale = 1,
}) => {
  const borderWidth = medalColor ? 4 : 0;
  const innerSize = size - borderWidth * 2;
  const fontSize = Math.round(innerSize * 0.4 * scale);

  return (
    <div
      style={{
        width: size * scale,
        height: size * scale,
        borderRadius: '50%',
        border: medalColor ? `${borderWidth}px solid ${medalColor}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
        color: '#ffffff',
        fontWeight: 600,
        fontSize: `${fontSize}px`,
        userSelect: 'none',
        boxShadow: medalColor ? `0 0 0 2px rgba(255,255,255,0.8)` : 'none',
        transition: 'all 0.25s ease-out',
      }}
    >
      {initial}
    </div>
  );
};

export default Avatar;
