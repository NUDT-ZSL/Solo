import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useGameStore } from '../store';
import type { InteractiveItem, Furniture, Door, Puzzle } from '../types';
import {
  createGestureRecognizer,
  createGyroscopeProvider
} from '../modules/deviceAPI';

const ROOM_W = 660;
const ROOM_H = 500;
const VIEW_W = 700;
const VIEW_H = 525;

interface Camera3D {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  fov: number;
}

type SceneObject3D = {
  type: 'furniture' | 'interactive' | 'door' | 'puzzle';
  id: string;
  worldX: number;
  worldY: number;
  worldZ: number;
  width: number;
  height: number;
  depth: number;
  ref: any;
};

function toPct(v: number, total: number) {
  return `${(v / total) * 100}%`;
}

function projectToScreen(
  cam: Camera3D,
  wx: number, wy: number, wz: number,
  viewW: number, viewH: number
): { screenX: number; screenY: number; depth: number; scale: number; visible: boolean } {
  const cosYaw = Math.cos(cam.yaw);
  const sinYaw = Math.sin(cam.yaw);
  const cosPitch = Math.cos(cam.pitch);
  const sinPitch = Math.sin(cam.pitch);

  const rx = wx - cam.x;
  const rz = wz - cam.y;
  const ry = wy;

  const tx = cosYaw * rx - sinYaw * rz;
  const ty = ry;
  const tz = sinYaw * rx + cosYaw * rz;

  const sx = tx;
  const sy = cosPitch * ty + sinPitch * tz;
  const sz = -sinPitch * ty + cosPitch * tz;

  if (sz <= 5) {
    return { screenX: 0, screenY: 0, depth: sz, scale: 0, visible: false };
  }

  const f = (viewW / 2) / Math.tan((cam.fov * Math.PI) / 360);
  const screenX = viewW / 2 + (sx * f) / sz;
  const screenY = viewH / 2 - (sy * f) / sz;
  const scale = f / sz;

  const withinFOV =
    screenX > -150 && screenX < viewW + 150 &&
    screenY > -150 && screenY < viewH + 150;

  return {
    screenX,
    screenY,
    depth: sz,
    scale,
    visible: withinFOV
  };
}

export default function GameCanvas() {
  const {
    rooms,
    currentRoomId,
    inventory,
    collectItem,
    openPuzzle,
    goThroughDoor
  } = useGameStore();

  const [is3D, setIs3D] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [camera, setCamera] = useState<Camera3D>({
    x: ROOM_W / 2,
    y: ROOM_H + 180,
    yaw: Math.PI,
    pitch: -0.3,
    fov: 75
  });

  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const room = rooms.find(r => r.id === currentRoomId);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!is3D) return;
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, [is3D]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current || !is3D) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setCamera(prev => {
      const newYaw = prev.yaw + dx * 0.005;
      const newPitch = Math.max(
        -1.2,
        Math.min(0.3, prev.pitch - dy * 0.005)
      );
      return { ...prev, yaw: newYaw, pitch: newPitch };
    });
  }, [is3D]);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!is3D) return;
    e.preventDefault();
    setCamera(prev => {
      const delta = e.deltaY * 0.001;
      const move = -delta * 50;
      const forwardX = Math.sin(prev.yaw) * move;
      const forwardZ = -Math.cos(prev.yaw) * move;
      const newX = Math.max(40, Math.min(ROOM_W - 40, prev.x + forwardX));
      const newY = Math.max(ROOM_H + 50, Math.min(ROOM_H + 500, prev.y + forwardZ));
      const newFov = Math.max(45, Math.min(100, prev.fov + delta * 20));
      return { ...prev, x: newX, y: newY, fov: newFov };
    });
  }, [is3D]);

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

  const sceneObjects = useMemo<SceneObject3D[]>(() => {
    const objects: SceneObject3D[] = [];
    room.furniture.forEach(f => {
      objects.push({
        type: 'furniture',
        id: f.id,
        worldX: f.x + f.width / 2,
        worldY: f.y + f.height / 2,
        worldZ: 30 + Math.random() * 20,
        width: f.width,
        height: f.height,
        depth: 40,
        ref: f
      });
    });
    room.doors.forEach(d => {
      objects.push({
        type: 'door',
        id: d.id,
        worldX: d.x + d.width / 2,
        worldY: d.y + d.height / 2,
        worldZ: 10,
        width: d.width,
        height: d.height,
        depth: 20,
        ref: d
      });
    });
    room.puzzles.forEach(p => {
      objects.push({
        type: 'puzzle',
        id: p.id,
        worldX: p.x + p.width / 2,
        worldY: p.y + p.height / 2,
        worldZ: 20,
        width: p.width,
        height: p.height,
        depth: 30,
        ref: p
      });
    });
    room.interactiveItems.forEach(i => {
      objects.push({
        type: 'interactive',
        id: i.item.id,
        worldX: i.x,
        worldY: i.y,
        worldZ: 50,
        width: 40,
        height: 40,
        depth: 40,
        ref: i
      });
    });
    return objects;
  }, [room]);

  const sortedObjects = useMemo(() => {
    if (!is3D) return sceneObjects;
    return sceneObjects
      .map(obj => ({
        ...obj,
        proj: projectToScreen(camera, obj.worldX, obj.worldY, obj.worldZ, VIEW_W, VIEW_H)
      }))
      .filter(obj => obj.proj.visible)
      .sort((a, b) => b.proj.depth - a.proj.depth);
  }, [sceneObjects, camera, is3D]);

  const lightParticles = useMemo(() => {
    const positions = [
      { x: 5, y: 5 },
      { x: 95, y: 8 },
      { x: 8, y: 92 },
      { x: 92, y: 88 }
    ];
    return positions.map((p, i) => ({
      id: i,
      x: p.x,
      y: p.y,
      delay: i * 0.3,
      size: 80 + Math.random() * 60,
      hue: Math.random() > 0.5 ? '#FFD600' : '#E94560'
    }));
  }, [currentRoomId]);

  const cameraInfo = is3D ? {
    posText: `X:${camera.x.toFixed(0)} Y:${camera.y.toFixed(0)} Y:${(camera.yaw * 180 / Math.PI).toFixed(0)}° P:${(camera.pitch * 180 / Math.PI).toFixed(0)}°`
  } : null;

  return (
    <div className="game-container">
      <div
        className={`game-canvas ${is3D ? 'mode-3d' : 'mode-2d'}`}
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={is3D ? { perspective: `${camera.fov}deg`, cursor: draggingRef.current ? 'grabbing' : 'grab' } : undefined}
      >
        {is3D ? (
          <div
            className="scene-3d"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${camera.pitch}rad) rotateY(${camera.yaw}rad) translateZ(0px)`
            }}
          >
            <div className="room-3d-floor" style={{ background: room.floorPattern }} />
            <div className="room-3d-ceiling" />
            <div className="room-3d-wall-n" style={{ background: room.wallPattern }} />
            <div className="room-3d-wall-s" style={{ background: room.wallPattern }} />
            <div className="room-3d-wall-e" style={{ background: room.wallPattern }} />
            <div className="room-3d-wall-w" style={{ background: room.wallPattern }} />
          </div>
        ) : (
          <>
            <div className="room-bg" style={{ background: room.wallPattern }} />
            <div className="room-floor" style={{ background: room.floorPattern }} />
          </>
        )}

        {lightParticles.map(p => (
          <div
            key={p.id}
            className="ambient-light"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              background: `radial-gradient(circle, ${p.hue}40 0%, transparent 70%)`
            }}
          />
        ))}

        <div className="room-header">
          <div className="room-name">📍 {room.name}</div>
          <div className="room-header-right">
            {is3D && cameraInfo && (
              <div className="camera-info" title={cameraInfo.posText}>
                🎥 FPS
              </div>
            )}
            <div className="puzzle-progress">
              谜题 {solvedCount} / {totalPuzzles}
            </div>
            <button
              className={`view-toggle ${is3D ? 'active' : ''}`}
              onClick={() => {
                setIs3D(v => !v);
                if (!is3D) {
                  setCamera({
                    x: ROOM_W / 2,
                    y: ROOM_H + 180,
                    yaw: Math.PI,
                    pitch: -0.3,
                    fov: 75
                  });
                }
              }}
              title={is3D ? '切换到2D俯视图' : '切换到3D第一人称'}
            >
              {is3D ? '🔲 2D' : '🎮 3D'}
            </button>
          </div>
        </div>

        {is3D ? (
          sortedObjects.map((obj: any) => {
            const p = obj.proj;
            const w = obj.width * p.scale;
            const h = obj.height * p.scale;
            const d = obj.depth * p.scale;
            const left = p.screenX - w / 2;
            const top = p.screenY - h / 2;
            const opacity = Math.max(0.15, Math.min(1, 1 - (p.depth - 100) / 1500));
            const baseStyle: React.CSSProperties = {
              left: `${(left / VIEW_W) * 100}%`,
              top: `${(top / VIEW_H) * 100}%`,
              width: `${(w / VIEW_W) * 100}%`,
              height: `${(h / VIEW_H) * 100}%`,
              zIndex: Math.floor(10000 - p.depth),
              opacity
            };

            if (obj.type === 'furniture') {
              const f = obj.ref as Furniture;
              return (
                <div
                  key={obj.id}
                  className="furniture furniture-3d"
                  style={{
                    ...baseStyle,
                    background: f.color,
                    transform: `translateZ(${d / 2}px)`,
                    boxShadow: `0 0 ${Math.min(40, d)}px rgba(0,0,0,0.5) inset`
                  }}
                >
                  {f.label && <span className="furniture-label">{f.label}</span>}
                </div>
              );
            }

            if (obj.type === 'door') {
              const dObj = obj.ref as Door;
              const allPuzzlesSolved = dObj.requiredPuzzleIds.every(id =>
                room.puzzles.find(pp => pp.id === id)?.solved
              );
              const isLocked = dObj.locked && !allPuzzlesSolved;
              return (
                <div
                  key={obj.id}
                  className={`door ${isLocked ? 'locked' : ''} ${dObj.isHidden ? 'hidden-door' : ''} door-3d`}
                  style={{
                    ...baseStyle,
                    background: 'linear-gradient(180deg, #4a3520 0%, #2a1f12 100%)'
                  }}
                  onClick={() => !isLocked && goThroughDoor(dObj.id)}
                >
                  <span className="door-label">{dObj.isHidden ? '???' : dObj.label}</span>
                </div>
              );
            }

            if (obj.type === 'puzzle') {
              const pz = obj.ref as Puzzle;
              return (
                <div
                  key={obj.id}
                  className={`puzzle-hotspot ${pz.solved ? 'solved' : ''} puzzle-3d`}
                  style={{
                    ...baseStyle,
                    background: pz.solved ? 'rgba(0, 200, 83, 0.3)' : 'rgba(233, 69, 96, 0.4)',
                    border: pz.solved
                      ? '2px solid rgba(0, 200, 83, 0.7)'
                      : '2px solid rgba(233, 69, 96, 0.7)'
                  }}
                  onClick={() => !pz.solved && openPuzzle(pz.id)}
                >
                  <span className="puzzle-icon" style={{ fontSize: `${Math.max(0.8, Math.min(2, p.scale * 2))}rem` }}>
                    {pz.type === 'jigsaw' && '🧩'}
                    {pz.type === 'password' && '🔐'}
                    {pz.type === 'connect' && '🔗'}
                    {pz.type === 'mechanism' && '⚙️'}
                  </span>
                </div>
              );
            }

            if (obj.type === 'interactive') {
              const item = obj.ref as InteractiveItem;
              if (item.collected || !item.visible) return null;
              const uid = `${room.id}-${item.item.id}`;
              const isCollecting = collectingId === uid;
              const iconSize = Math.max(14, Math.min(40, 28 * p.scale));
              return (
                <div
                  key={obj.id}
                  className={`interactive-item ${isCollecting ? 'collecting' : ''} interactive-3d`}
                  style={{
                    position: 'absolute',
                    transform: 'none',
                    ...baseStyle,
                    pointerEvents: opacity < 0.3 ? 'none' : 'auto'
                  }}
                  onMouseEnter={() => setHoveredItem(item.item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => handleItemClick(item)}
                >
                  <span style={{ fontSize: `${iconSize}px` }}>{item.item.icon}</span>
                  {hoveredItem === item.item.id && (
                    <div className="inventory-tooltip" style={{ bottom: '100%', marginBottom: '8px' }}>
                      {item.item.name}
                      {item.requiresItem && ' (需要道具)'}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })
        ) : (
          <>
            {room.furniture.map(f => (
              <div
                key={f.id}
                className="furniture"
                style={{
                  left: toPct(f.x, ROOM_W),
                  top: toPct(f.y, ROOM_H),
                  width: toPct(f.width, ROOM_W),
                  height: toPct(f.height, ROOM_H),
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
                    left: toPct(door.x, ROOM_W),
                    top: toPct(door.y, ROOM_H),
                    width: toPct(door.width, ROOM_W),
                    height: toPct(door.height, ROOM_H)
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
                  left: toPct(puzzle.x, ROOM_W),
                  top: toPct(puzzle.y, ROOM_H),
                  width: toPct(puzzle.width, ROOM_W),
                  height: toPct(puzzle.height, ROOM_H),
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
              if (item.collected || !item.visible) return null;
              const uid = `${room.id}-${item.item.id}`;
              const isCollecting = collectingId === uid;
              return (
                <div
                  key={item.item.id}
                  className={`interactive-item ${isCollecting ? 'collecting' : ''}`}
                  style={{
                    left: toPct(item.x, ROOM_W),
                    top: toPct(item.y, ROOM_H)
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
          </>
        )}

        {is3D && (
          <div className="crosshair">
            <div className="crosshair-h" />
            <div className="crosshair-v" />
          </div>
        )}
      </div>
    </div>
  );
}
