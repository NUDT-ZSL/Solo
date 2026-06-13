import React, { useMemo } from 'react';
import type { Player } from './types';

interface PlayerAvatarProps {
  player: Player;
  cellSize: number;
  playerIndex: number;
  totalPlayers: number;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  cellSize,
  playerIndex,
  totalPlayers,
}) => {
  const offset = useMemo(() => {
    const padding = cellSize * 0.15;
    const avatarRadius = cellSize * 0.18;
    const offsetMap: Record<number, Array<{ x: number; y: number }>> = {
      2: [
        { x: padding, y: padding },
        { x: cellSize - padding - avatarRadius * 2, y: cellSize - padding - avatarRadius * 2 },
      ],
      3: [
        { x: padding, y: padding },
        { x: cellSize - padding - avatarRadius * 2, y: padding },
        { x: cellSize / 2 - avatarRadius, y: cellSize - padding - avatarRadius * 2 },
      ],
      4: [
        { x: padding, y: padding },
        { x: cellSize - padding - avatarRadius * 2, y: padding },
        { x: padding, y: cellSize - padding - avatarRadius * 2 },
        { x: cellSize - padding - avatarRadius * 2, y: cellSize - padding - avatarRadius * 2 },
      ],
    };
    return offsetMap[totalPlayers]?.[playerIndex] || { x: 0, y: 0 };
  }, [cellSize, playerIndex, totalPlayers]);

  const avatarSize = cellSize * 0.36;
  const left = player.gridX * cellSize + offset.x;
  const top = player.gridY * cellSize + offset.y;

  if (player.isBankrupt) {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          borderRadius: '50%',
          backgroundColor: '#9ca3af',
          border: '2px solid #6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: `${avatarSize * 0.4}px`,
          fontWeight: 'bold',
          transition: 'left 300ms ease-in-out, top 300ms ease-in-out',
          zIndex: 10,
          opacity: 0.6,
        }}
      >
        {player.name.charAt(0)}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${avatarSize}px`,
        height: `${avatarSize}px`,
        borderRadius: '50%',
        backgroundColor: player.color,
        border: '2px solid #ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: `${avatarSize * 0.4}px`,
        fontWeight: 'bold',
        transition: 'left 300ms ease-in-out, top 300ms ease-in-out, transform 150ms',
        zIndex: 10,
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
      }}
    >
      {player.name.charAt(0)}
    </div>
  );
};

export default PlayerAvatar;
