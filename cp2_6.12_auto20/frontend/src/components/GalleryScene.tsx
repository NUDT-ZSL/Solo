import React, { useRef, useMemo, useCallback, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Hall, Artwork } from '../services/api';
import { useGalleryControls } from '../hooks/useGalleryControls';

interface GallerySceneProps {
  halls: Hall[];
  activeHallId: string;
  onHallChange: (hallId: string) => void;
  onArtworkClick: (artwork: Artwork) => void;
}

interface ArtworkFrameProps {
  artwork: Artwork;
  onClick: (artwork: Artwork) => void;
}

interface SpotlightProps {
  position: [number, number, number];
  targetPosition: [number, number, number];
}

interface DoorFrameProps {
  position: [number, number, number];
  rotation: [number, number, number];
  targetHallId: string;
}

interface CorridorProps {
  start: [number, number, number];
  end: [number, number, number];
  wallColor: string;
}

interface HallRoomProps {
  hall: Hall;
  onArtworkClick: (artwork: Artwork) => void;
}

const WALL_THICKNESS = 0.15;
const DEFAULT_WALL_COLOR = '#F5F0E8';
const FLOOR_COLOR = '#2A2A2A';
const GRID_COLOR = '#3A3A3A';
const GOLD_COLOR = '#C5A55A';
const FRAME_DEPTH = 0.05;
const FRAME_BORDER = 0.08;

function ArtworkTexture({ url }: { url: string }) {
  const texture = useTexture(url);
  return <primitive object={texture} attach="map" />;
}

const ArtworkFrame = React.memo(function ArtworkFrame({ artwork, onClick }: ArtworkFrameProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(() => {
    onClick(artwork);
  }, [artwork, onClick]);

  const { position, rotation } = useMemo(() => {
    let pos: [number, number, number] = [0, 0, 0];
    let rot: [number, number, number] = [0, 0, 0];
    const px = artwork.positionX ?? 0;
    const py = artwork.positionY ?? 1.4;
    const offset = WALL_THICKNESS / 2 + FRAME_DEPTH / 2 + 0.005;

    switch (artwork.wall) {
      case 'north':
        pos = [px, py, -offset];
        rot = [0, 0, 0];
        break;
      case 'south':
        pos = [px, py, offset];
        rot = [0, Math.PI, 0];
        break;
      case 'east':
        pos = [offset, py, px];
        rot = [0, -Math.PI / 2, 0];
        break;
      case 'west':
        pos = [-offset, py, px];
        rot = [0, Math.PI / 2, 0];
        break;
    }
    return { position: pos, rotation: rot };
  }, [artwork.wall, artwork.positionX, artwork.positionY]);

  const frameWidth = (artwork.width ?? 1) + FRAME_BORDER * 2;
  const frameHeight = (artwork.height ?? 0.7) + FRAME_BORDER * 2;
  const canvasWidth = artwork.width ?? 1;
  const canvasHeight = artwork.height ?? 0.7;

  return (
    <group position={position} rotation={rotation}>
      <mesh
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[frameWidth, frameHeight, FRAME_DEPTH]} />
        <meshStandardMaterial color={GOLD_COLOR} metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.002]}>
        <planeGeometry args={[canvasWidth, canvasHeight]} />
        <meshStandardMaterial color="#888888" side={THREE.FrontSide}>
          {artwork.imageUrl && (
            <Suspense fallback={null}>
              <ArtworkTexture url={artwork.imageUrl} />
            </Suspense>
          )}
        </meshStandardMaterial>
      </mesh>

      {hovered && (
        <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.01]}>
          <planeGeometry args={[frameWidth + 0.02, frameHeight + 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.FrontSide} />
        </mesh>
      )}
    </group>
  );
});

function Particles({ count = 30 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 1] = Math.random() * -1.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i);
      y += delta * 0.08;
      if (y > 0) y = -1.2;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFF8E1"
        size={0.015}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

const Spotlight = React.memo(function Spotlight({ position, targetPosition }: SpotlightProps) {
  const coneHeight = Math.abs(position[1] - targetPosition[1]);
  const coneRadius = coneHeight * Math.tan(0.4);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.position.set(...targetPosition);
    }
  }, [targetPosition]);

  return (
    <group>
      <object3D ref={targetRef} position={targetPosition} />
      <spotLight
        position={position}
        target={targetRef.current ?? undefined}
        angle={0.4}
        penumbra={0.5}
        intensity={2}
        color="#FFF8E1"
        castShadow
      />
      <mesh position={[position[0], position[1] - coneHeight / 2, position[2]]}>
        <coneGeometry args={[coneRadius, coneHeight, 16, 1, true]} />
        <meshBasicMaterial
          color="#FFF8E1"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <group position={position}>
        <Particles count={30} />
      </group>
    </group>
  );
});

const DoorFrame = React.memo(function DoorFrame({
  position,
  rotation,
  targetHallId,
}: DoorFrameProps) {
  const leftDoorRef = useRef<THREE.Mesh>(null);
  const rightDoorRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const openness = useRef(0);

  const doorWidth = 1.0;
  const doorHeight = 2.2;
  const frameBorderW = 0.1;

  useFrame(() => {
    const doorWorldPos = new THREE.Vector3(...position);
    const dist = camera.position.distanceTo(doorWorldPos);
    const targetOpenness = dist < 3 ? 1 : 0;
    openness.current = THREE.MathUtils.lerp(openness.current, targetOpenness, 0.05);

    if (leftDoorRef.current) {
      leftDoorRef.current.position.x = -doorWidth / 4 - (openness.current * doorWidth / 2);
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.position.x = doorWidth / 4 + (openness.current * doorWidth / 2);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, doorHeight / 2 + frameBorderW / 2, 0]}>
        <boxGeometry args={[doorWidth + frameBorderW * 2, frameBorderW, WALL_THICKNESS + 0.02]} />
        <meshStandardMaterial color={GOLD_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-(doorWidth / 2 + frameBorderW / 2), doorHeight / 2, 0]}>
        <boxGeometry args={[frameBorderW, doorHeight, WALL_THICKNESS + 0.02]} />
        <meshStandardMaterial color={GOLD_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[(doorWidth / 2 + frameBorderW / 2), doorHeight / 2, 0]}>
        <boxGeometry args={[frameBorderW, doorHeight, WALL_THICKNESS + 0.02]} />
        <meshStandardMaterial color={GOLD_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>

      <group position={[0, doorHeight / 2, 0]}>
        <mesh ref={leftDoorRef} position={[-doorWidth / 4, 0, 0]}>
          <boxGeometry args={[doorWidth / 2, doorHeight, WALL_THICKNESS * 0.8]} />
          <meshStandardMaterial color="#8B7D5C" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh ref={rightDoorRef} position={[doorWidth / 4, 0, 0]}>
          <boxGeometry args={[doorWidth / 2, doorHeight, WALL_THICKNESS * 0.8]} />
          <meshStandardMaterial color="#8B7D5C" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
});

const Corridor = React.memo(function Corridor({ start, end, wallColor }: CorridorProps) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const centerX = (start[0] + end[0]) / 2;
  const centerZ = (start[2] + end[2]) / 2;
  const corridorHeight = 2.8;
  const corridorWidth = 2;

  return (
    <group position={[centerX, corridorHeight / 2, centerZ]} rotation={[0, angle, 0]}>
      <mesh position={[0, corridorHeight / 2, 0]}>
        <boxGeometry args={[corridorWidth, WALL_THICKNESS, length]} />
        <meshStandardMaterial color={wallColor || DEFAULT_WALL_COLOR} />
      </mesh>
      <mesh position={[-corridorWidth / 2, 0, 0]}>
        <boxGeometry args={[WALL_THICKNESS, corridorHeight, length]} />
        <meshStandardMaterial color={wallColor || DEFAULT_WALL_COLOR} />
      </mesh>
      <mesh position={[corridorWidth / 2, 0, 0]}>
        <boxGeometry args={[WALL_THICKNESS, corridorHeight, length]} />
        <meshStandardMaterial color={wallColor || DEFAULT_WALL_COLOR} />
      </mesh>
      <mesh position={[0, -corridorHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[corridorWidth, length]} />
        <meshStandardMaterial color={FLOOR_COLOR} />
      </mesh>
    </group>
  );
});

function createGridTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = FLOOR_COLOR;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  const step = size / 8;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

const HallRoom = React.memo(function HallRoom({ hall, onArtworkClick }: HallRoomProps) {
  const w = hall.width;
  const h = hall.height;
  const d = hall.depth;
  const wallColor = hall.wallColor || DEFAULT_WALL_COLOR;

  const gridTexture = useMemo(() => createGridTexture(), []);

  const spotlights = useMemo(() => {
    return (hall.artworks ?? []).map((artwork) => {
      const px = artwork.positionX ?? 0;
      const py = artwork.positionY ?? 1.4;
      const lightY = h - 0.3;
      let lightPos: [number, number, number] = [px, lightY, 0];
      let targetPos: [number, number, number] = [px, py, 0];
      const offset = WALL_THICKNESS + 0.3;
      switch (artwork.wall) {
        case 'north':
          lightPos = [px, lightY, -offset];
          targetPos = [px, py, -WALL_THICKNESS / 2];
          break;
        case 'south':
          lightPos = [px, lightY, offset];
          targetPos = [px, py, WALL_THICKNESS / 2];
          break;
        case 'east':
          lightPos = [offset, lightY, px];
          targetPos = [WALL_THICKNESS / 2, py, px];
          break;
        case 'west':
          lightPos = [-offset, lightY, px];
          targetPos = [-WALL_THICKNESS / 2, py, px];
          break;
      }
      return { lightPos, targetPos, key: artwork.id };
    });
  }, [hall.artworks, h]);

  const doors = useMemo(() => {
    if (!hall.connections) return [];
    return hall.connections.map((conn) => {
      let pos: [number, number, number] = [0, 0, 0];
      let rot: [number, number, number] = [0, 0, 0];
      switch (conn.direction) {
        case 'north':
          pos = [0, 0, -d / 2];
          rot = [0, 0, 0];
          break;
        case 'south':
          pos = [0, 0, d / 2];
          rot = [0, Math.PI, 0];
          break;
        case 'east':
          pos = [w / 2, 0, 0];
          rot = [0, -Math.PI / 2, 0];
          break;
        case 'west':
          pos = [-w / 2, 0, 0];
          rot = [0, Math.PI / 2, 0];
          break;
      }
      return { position: pos, rotation: rot, targetHallId: conn.targetHallId };
    });
  }, [hall.connections, w, d]);

  return (
    <group>
      <mesh position={[0, h / 2, -d / 2]}>
        <boxGeometry args={[w, h, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, h / 2, d / 2]}>
        <boxGeometry args={[w, h, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]}>
        <boxGeometry args={[WALL_THICKNESS, h, d]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]}>
        <boxGeometry args={[WALL_THICKNESS, h, d]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={gridTexture} />
      </mesh>

      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#E8E3DA" />
      </mesh>

      {(hall.artworks ?? []).map((artwork) => (
        <Suspense key={artwork.id} fallback={null}>
          <ArtworkFrame artwork={artwork} onClick={onArtworkClick} />
        </Suspense>
      ))}

      {spotlights.map((s) => (
        <Spotlight key={s.key} position={s.lightPos} targetPosition={s.targetPos} />
      ))}

      {doors.map((door) => (
        <DoorFrame
          key={door.targetHallId}
          position={door.position}
          rotation={door.rotation}
          targetHallId={door.targetHallId}
        />
      ))}

      {hall.connections?.map((conn) => {
        let start: [number, number, number];
        let end: [number, number, number];
        switch (conn.direction) {
          case 'north':
            start = [0, 0, -d / 2];
            end = [0, 0, -d / 2 - 3];
            break;
          case 'south':
            start = [0, 0, d / 2];
            end = [0, 0, d / 2 + 3];
            break;
          case 'east':
            start = [w / 2, 0, 0];
            end = [w / 2 + 3, 0, 0];
            break;
          case 'west':
            start = [-w / 2, 0, 0];
            end = [-w / 2 - 3, 0, 0];
            break;
          default:
            start = [0, 0, -d / 2];
            end = [0, 0, -d / 2 - 3];
        }
        return (
          <Corridor
            key={conn.targetHallId}
            start={start}
            end={end}
            wallColor={wallColor}
          />
        );
      })}

      <pointLight position={[0, h - 0.5, 0]} intensity={0.8} color="#FFF0D0" distance={w} decay={2} />
    </group>
  );
});

function PlayerController({ hallWidth, hallHeight, hallDepth, onCollisionFlash }: {
  hallWidth: number;
  hallHeight: number;
  hallDepth: number;
  onCollisionFlash: (flash: boolean) => void;
}) {
  const { groupRef, collisionFlash } = useGalleryControls({
    hallWidth,
    hallHeight,
    hallDepth,
  });

  const { camera } = useThree();

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.add(camera);
    }
    return () => {
      if (groupRef.current) {
        groupRef.current.remove(camera);
      }
    };
  }, [camera, groupRef]);

  useEffect(() => {
    onCollisionFlash(collisionFlash);
  }, [collisionFlash, onCollisionFlash]);

  return <group ref={groupRef} position={[0, 1.6, 0]} />;
}

function SceneContent({
  halls,
  activeHallId,
  onArtworkClick,
  onCollisionFlash,
}: GallerySceneProps & { onCollisionFlash: (flash: boolean) => void }) {
  const { scene } = useThree();

  const activeHall = useMemo(
    () => halls.find((h) => h.id === activeHallId),
    [halls, activeHallId]
  );

  useEffect(() => {
    if (activeHall) {
      const color = activeHall.wallColor || DEFAULT_WALL_COLOR;
      scene.fog = new THREE.Fog(color, 15, 40);
      scene.background = new THREE.Color(color);
    }
  }, [activeHall, scene]);

  return (
    <>
      <ambientLight intensity={0.3} color="#FFF8E7" />
      {activeHall && (
        <PlayerController
          hallWidth={activeHall.width}
          hallHeight={activeHall.height}
          hallDepth={activeHall.depth}
          onCollisionFlash={onCollisionFlash}
        />
      )}
      {halls.map((hall) => (
        <group key={hall.id} visible={hall.id === activeHallId}>
          <HallRoom hall={hall} onArtworkClick={onArtworkClick} />
        </group>
      ))}
    </>
  );
}

function FPSDisplay({ fpsRef }: { fpsRef: React.MutableRefObject<number> }) {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFps(fpsRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [fpsRef]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        color: '#aaa',
        fontSize: 12,
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.4)',
        padding: '2px 6px',
        borderRadius: 4,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {fps} FPS
    </div>
  );
}

function FPSCounter({ fpsRef }: { fpsRef: React.MutableRefObject<number> }) {
  useFrame(() => {
    const counter = fpsRef as React.MutableRefObject<number> & { _count?: number; _lastTime?: number };
    if (!counter._count) counter._count = 0;
    if (!counter._lastTime) counter._lastTime = performance.now();
    counter._count++;
    const now = performance.now();
    if (now - counter._lastTime >= 1000) {
      counter.current = counter._count;
      counter._count = 0;
      counter._lastTime = now;
    }
  });
  return null;
}

export default function GalleryScene({ halls, activeHallId, onHallChange, onArtworkClick }: GallerySceneProps) {
  const [collisionFlash, setCollisionFlash] = useState(false);
  const fpsRef = useRef(0);

  const handleCollisionFlash = useCallback((flash: boolean) => {
    setCollisionFlash(flash);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ fov: 65, near: 0.1, far: 100, position: [0, 1.6, 0] }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <FPSCounter fpsRef={fpsRef} />
          <SceneContent
            halls={halls}
            activeHallId={activeHallId}
            onArtworkClick={onArtworkClick}
            onHallChange={onHallChange}
            onCollisionFlash={handleCollisionFlash}
          />
        </Suspense>
      </Canvas>

      <FPSDisplay fpsRef={fpsRef} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transition: 'box-shadow 0.15s ease-out',
          boxShadow: collisionFlash
            ? 'inset 0 0 80px 20px rgba(200, 30, 30, 0.5)'
            : 'inset 0 0 0 0 rgba(200, 30, 30, 0)',
        }}
      />
    </div>
  );
}
