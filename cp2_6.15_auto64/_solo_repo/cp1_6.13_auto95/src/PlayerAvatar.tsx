import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Player, CellConfig } from './types';
import { getGridCoords } from './GameStateManager';

interface PlayerAvatarProps {
  player: Player;
  cellSize: number;
  playerIndex: number;
  totalPlayers: number;
  cells: CellConfig[];
}

const STEP_DURATION = 300;

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  cellSize,
  playerIndex,
  totalPlayers,
  cells,
}) => {
  const [visualGridX, setVisualGridX] = useState(player.gridX);
  const [visualGridY, setVisualGridY] = useState(player.gridY);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPositionRef = useRef(player.position);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const offset = useMemo(() => {
    const padding = cellSize * 0.15;
    const avatarDiameter = cellSize * 0.36;
    const offsetMap: Record<number, Array<{ x: number; y: number }>> = {
      2: [
        { x: padding, y: padding },
        { x: cellSize - padding - avatarDiameter, y: cellSize - padding - avatarDiameter },
      ],
      3: [
        { x: padding, y: padding },
        { x: cellSize - padding - avatarDiameter, y: padding },
        { x: cellSize / 2 - avatarDiameter / 2, y: cellSize - padding - avatarDiameter },
      ],
      4: [
        { x: padding, y: padding },
        { x: cellSize - padding - avatarDiameter, y: padding },
        { x: padding, y: cellSize - padding - avatarDiameter },
        { x: cellSize - padding - avatarDiameter, y: cellSize - padding - avatarDiameter },
      ],
    };
    return offsetMap[totalPlayers]?.[playerIndex] || { x: 0, y: 0 };
  }, [cellSize, playerIndex, totalPlayers]);

  useEffect(() => {
    if (player.position !== prevPositionRef.current && !player.isBankrupt) {
      const fromPos = prevPositionRef.current;
      const toPos = player.position;
      prevPositionRef.current = toPos;

      let forwardSteps: number[];
      if (toPos >= fromPos) {
        forwardSteps = [];
        for (let i = 1; i <= toPos - fromPos; i++) {
          forwardSteps.push((fromPos + i) % 40);
        }
      } else {
        forwardSteps = [];
        const totalForward = toPos - fromPos + 40;
        for (let i = 1; i <= totalForward; i++) {
          forwardSteps.push((fromPos + i) % 40);
        }
      }

      if (forwardSteps.length === 0) {
        setVisualGridX(player.gridX);
        setVisualGridY(player.gridY);
        return;
      }

      setIsAnimating(true);

      let stepIdx = 0;
      const animateStep = () => {
        if (stepIdx >= forwardSteps.length) {
          setIsAnimating(false);
          setVisualGridX(player.gridX);
          setVisualGridY(player.gridY);
          return;
        }
        const nextPos = forwardSteps[stepIdx];
        const coords = getGridCoords(nextPos);
        setVisualGridX(coords.gridX);
        setVisualGridY(coords.gridY);
        stepIdx++;
        animTimerRef.current = setTimeout(animateStep, STEP_DURATION);
      };

      animateStep();
    } else if (player.isBankrupt) {
      const coords = getGridCoords(player.position);
      setVisualGridX(coords.gridX);
      setVisualGridY(coords.gridY);
    } else {
      setVisualGridX(player.gridX);
      setVisualGridY(player.gridY);
      prevPositionRef.current = player.position;
    }

    return () => {
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
      }
    };
  }, [player.position, player.gridX, player.gridY, player.isBankrupt]);

  const avatarSize = cellSize * 0.36;
  const left = visualGridX * cellSize + offset.x;
  const top = visualGridY * cellSize + offset.y;

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
          transition: isAnimating
            ? `left ${STEP_DURATION}ms cubic-bezier(0.42,0,0.58,1), top ${STEP_DURATION}ms cubic-bezier(0.42,0,0.58,1)`
            : 'none',
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
        transition: isAnimating
          ? `left ${STEP_DURATION}ms cubic-bezier(0.42,0,0.58,1), top ${STEP_DURATION}ms cubic-bezier(0.42,0,0.58,1)`
          : 'none',
        zIndex: 10,
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
      }}
    >
      {player.name.charAt(0)}
    </div>
  );
};

export default PlayerAvatar;
