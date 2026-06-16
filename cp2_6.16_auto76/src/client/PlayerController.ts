import { Position, Player } from '../types';
import { DungeonGenerator } from './DungeonGenerator';

export interface MoveResult {
  player: Player;
  moved: boolean;
  newPosition: Position;
  hungerDepleted: boolean;
  hpLost: number;
}

export const checkCollision = (
  x: number,
  y: number,
  dungeon: DungeonGenerator
): boolean => {
  return dungeon.isWalkable(x, y);
};

export const movePlayer = (
  player: Player,
  direction: 'up' | 'down' | 'left' | 'right',
  dungeon: DungeonGenerator
): MoveResult => {
  let dx = 0;
  let dy = 0;

  switch (direction) {
    case 'up':
      dy = -1;
      break;
    case 'down':
      dy = 1;
      break;
    case 'left':
      dx = -1;
      break;
    case 'right':
      dx = 1;
      break;
  }

  const newX = player.position.x + dx;
  const newY = player.position.y + dy;

  if (!checkCollision(newX, newY, dungeon)) {
    return {
      player,
      moved: false,
      newPosition: player.position,
      hungerDepleted: false,
      hpLost: 0
    };
  }

  const updatedPlayer = { ...player };
  updatedPlayer.position = { x: newX, y: newY };

  updatedPlayer.hunger = Math.max(0, updatedPlayer.hunger - 2);

  let hpLost = 0;
  let hungerDepleted = false;
  if (updatedPlayer.hunger <= 0) {
    hungerDepleted = true;
    hpLost = 1;
    updatedPlayer.hp = Math.max(0, updatedPlayer.hp - 1);
  }

  return {
    player: updatedPlayer,
    moved: true,
    newPosition: { x: newX, y: newY },
    hungerDepleted,
    hpLost
  };
};

export const getAdjacentMonsters = (
  playerPos: Position,
  monsters: { position: Position }[]
): number[] => {
  const adjacentIndices: number[] = [];
  monsters.forEach((monster, index) => {
    const dx = Math.abs(playerPos.x - monster.position.x);
    const dy = Math.abs(playerPos.y - monster.position.y);
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      adjacentIndices.push(index);
    }
  });
  return adjacentIndices;
};
