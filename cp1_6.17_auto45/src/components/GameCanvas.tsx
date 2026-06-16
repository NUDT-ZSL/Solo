import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import type { InteractiveItem } from '../types';
import {
  createGestureRecognizer,
  createGyroscopeProvider
} from '../modules/deviceAPI';

export default function GameCanvas() {
  const {
    rooms,
    currentRoomId,
    inventory,
    collectItem,
    openPuzzle,
    goThroughDoor
  } = useGameStore();

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const recognizer = createGestureRecognizer();
    const gyro = createGyroscopeProvider();
    recognizer.attach(canvasRef.current);
    gyro.start(true);
    return () => {
      recognizer.detach();
      gyro.stop();
    };
  }, []);

  const room = rooms.find(r => r.id === currentRoomId);
  if (!room) return null;

  const solvedCount = room.puzzles.filter(p => p.solved).length;
  const totalPuzzles = room.puzzles.length;

  const handleItemClick = (item: InteractiveItem) => {
    if (item.collected || !item.visible || collectingId) return;
    if (item.requiresItem) {
      const hasRequired = inventory.some(i => i.item.id === item.requiresItem);
      if (!hasRequired) {
        useGameStore.getState().setErrorFlash(true);
        setTimeout(() => useGameStore.getState().setErrorFlash(false), 300);
        return;
      }
    }
    const uid = `${room.id}-${item.item.id}`;
    setCollectingId(uid);
    setTimeout(() => {
      collectItem(item.item.id, room.id);
      setCollectingId(null);
    }, 300);
  };

  return (
    <div className="game-container">
      <div className="game-canvas" ref={canvasRef}>
        <div
          className="room-bg"
          style={{ background: room.wallPattern }}
        />
        <div
          className="room-floor"
          style={{ background: room.floorPattern }}
        />

        <div className="room-header">
          <div className="room-name">📍 {room.name}</div>
          <div className="puzzle-progress">
            谜题 {solvedCount} / {totalPuzzles}
          </div>
        </div>

        {room.furniture.map(f => (
          <div
            key={f.id}
            className="furniture"
            style={{
              left: `${(f.x / 660) * 100}%`,
              top: `${(f.y / 500) * 100}%`,
              width: `${(f.width / 660) * 100}%`,
              height: `${(f.height / 500) * 100}%`,
              background: f.color
            }}
          >
            {f.label && <span className="furniture-label">{f.label}</span>}
          </div>
        ))}

        {room.doors.map(door => {
          const allPuzzlesSolved = door.requiredPuzzleIds.every(id =>
            room.puzzles.find(p => p.id === id)?.solved
          );
          const isLocked = door.locked && !allPuzzlesSolved;
          return (
            <div
              key={door.id}
              className={`door ${isLocked ? 'locked' : ''} ${door.isHidden ? 'hidden-door' : ''}`}
              style={{
                left: `${(door.x / 660) * 100}%`,
                top: `${(door.y / 500) * 100}%`,
                width: `${(door.width / 660) * 100}%`,
                height: `${(door.height / 500) * 100}%`
              }}
              onClick={() => !isLocked && goThroughDoor(door.id)}
            >
              <span className="door-label">
                {door.isHidden ? '???' : door.label}
              </span>
            </div>
          );
        })}

        {room.puzzles.map(puzzle => (
          <div
            key={puzzle.id}
            className={`puzzle-hotspot ${puzzle.solved ? 'solved' : ''}`}
            style={{
              left: `${(puzzle.x / 660) * 100}%`,
              top: `${(puzzle.y / 500) * 100}%`,
              width: `${(puzzle.width / 660) * 100}%`,
              height: `${(puzzle.height / 500) * 100}%`,
              background: puzzle.solved
                ? 'rgba(0, 200, 83, 0.2)'
                : 'rgba(233, 69, 96, 0.3)',
              border: puzzle.solved
                ? '2px solid rgba(0, 200, 83, 0.5)'
                : '2px solid rgba(233, 69, 96, 0.5)'
            }}
            onClick={() => !puzzle.solved && openPuzzle(puzzle.id)}
          >
            <span className="puzzle-icon">
              {puzzle.type === 'jigsaw' && '🧩'}
              {puzzle.type === 'password' && '🔐'}
              {puzzle.type === 'connect' && '🔗'}
              {puzzle.type === 'mechanism' && '⚙️'}
            </span>
          </div>
        ))}

        {room.interactiveItems.map(item => {
          if (item.collected) return null;
          const uid = `${room.id}-${item.item.id}`;
          const isCollecting = collectingId === uid;
          return (
            <div
              key={item.item.id}
              className={`interactive-item ${!item.visible ? 'hidden-item' : ''} ${isCollecting ? 'collecting' : ''}`}
              style={{
                left: `${(item.x / 660) * 100}%`,
                top: `${(item.y / 500) * 100}%`
              }}
              onMouseEnter={() => setHoveredItem(item.item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => handleItemClick(item)}
            >
              {item.item.icon}
              {hoveredItem === item.item.id && (
                <div className="inventory-tooltip" style={{ bottom: '50px' }}>
                  {item.item.name}
                  {item.requiresItem && ' (需要道具)'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
