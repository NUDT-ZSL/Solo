import React, { useRef, useMemo, useCallback, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Hall, Artwork } from '../services/api';
import { useGalleryControls, CollisionBox } from '../hooks/useGalleryControls';

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

class TextureErrorBoundary extends React.Component<{children: React.ReactNode; fallback: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode; fallback: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) { return { hasError: true }; }
  componentDidCatch(_e: Error, _i: React.ErrorInfo) {}
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function createPlaceholderTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#D7CCC8';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#BCAAA4';
  ctx.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  const cx = size / 2;
  const cy = size / 2;
  const frameW = size * 0.35;
  const frameH = size * 0.28;
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 8;
  ctx.strokeRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH);
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(cx - 8, cy - 3, 16, 6);

  ctx.strokeStyle = '#A1887F';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - frameW / 4, cy + frameH / 4);
  ctx.lineTo(cx, cy - frameH / 6);
  ctx.lineTo(cx + frameW / 5, cy + frameH / 10);
  ctx.lineTo(cx + frameW / 3, cy - frameH / 5);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function PlaceholderFallback({ transparent = false }: { transparent?: boolean }) {
  const placeholderTexture = useMemo(() => createPlaceholderTexture(), []);
  return (
    <meshStandardMaterial
      color="#D7CCC8"
      side={THREE.FrontSide}
      map={placeholderTexture}
      transparent={transparent}
      opacity={transparent ? 0.6 : 1}
    />
  );
}

const WALL_THICKNESS = 0.15;
const DEFAULT_WALL_COLOR = '#F5F0E8';
const FLOOR_COLOR = '#2A2A2A';
const GRID_COLOR = '#3A3A3A';
const GOLD_COLOR = '#C5A55A';
const FRAME_DEPTH = 0.05;
const FRAME_BORDER = 0.08;

const DOOR_WIDTH = 1.0;
const DOOR_HEIGHT = 2.2;
const DOOR_FRAME_BORDER = 0.1;
const DOOR_FRAME_DEPTH = WALL_THICKNESS + 0.02;
const DOOR_OPEN_THRESHOLD = 3;
const DOOR_CLOSE_THRESHOLD = 5;
const DOOR_MAX_STEP = 0.08;
const DOOR_SPEED = 3.0;

export function computeDoorCollisionBox(
  position: [number, number, number],
  rotation: [number, number, number],
  wallWidth: number,
  wallHeight: number,
  wallDepth: number
): THREE.Box3 {
  const halfWidth = wallWidth / 2 + DOOR_FRAME_BORDER;
  const fullHeight = wallHeight + DOOR_FRAME_BORDER;
  const halfDepth = wallDepth / 2;

  const localMin = new THREE.Vector3(-halfWidth, 0, -halfDepth);
  const localMax = new THREE.Vector3(halfWidth, fullHeight, halfDepth);

  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotation[0], rotation[1], rotation[2])
  );
  const p = new THREE.Vector3(...position);

  const corners = [
    new THREE.Vector3(localMin.x, localMin.y, localMin.z),
    new THREE.Vector3(localMax.x, localMin.y, localMin.z),
    new THREE.Vector3(localMin.x, localMax.y, localMin.z),
    new THREE.Vector3(localMax.x, localMax.y, localMin.z),
    new THREE.Vector3(localMin.x, localMin.y, localMax.z),
    new THREE.Vector3(localMax.x, localMin.y, localMax.z),
    new THREE.Vector3(localMin.x, localMax.y, localMax.z),
    new THREE.Vector3(localMax.x, localMax.y, localMax.z),
  ];

  const worldCorners = corners.map((c) => c.applyQuaternion(q).add(p));

  const box = new THREE.Box3();
  worldCorners.forEach((c) => box.expandByPoint(c));
  return box;
}

export function computeArtworkCollisionBox(artwork: Artwork): CollisionBox {
  const fw = (artwork.width ?? 1) + FRAME_BORDER * 2;
  const fh = (artwork.height ?? 0.7) + FRAME_BORDER * 2;
  const fd = FRAME_DEPTH + 0.08;

  const px = artwork.positionX ?? 0;
  const py = artwork.positionY ?? 1.4;
  const wallOffset = WALL_THICKNESS / 2 + fd / 2 + 0.005;

  const halfW = fw / 2;
  const halfH = fh / 2;
  const halfD = fd / 2;

  let minX = 0, maxX = 0, minY = py - halfH, maxY = py + halfH, minZ = 0, maxZ = 0;

  switch (artwork.wall) {
    case 'north':
      minX = px - halfW; maxX = px + halfW;
      minZ = -wallOffset - halfD; maxZ = -wallOffset + halfD;
      break;
    case 'south':
      minX = px - halfW; maxX = px + halfW;
      minZ = wallOffset - halfD; maxZ = wallOffset + halfD;
      break;
    case 'east':
      minX = wallOffset - halfD; maxX = wallOffset + halfD;
      minZ = px - halfW; maxZ = px + halfW;
      break;
    case 'west':
      minX = -wallOffset - halfD; maxX = -wallOffset + halfD;
      minZ = px - halfW; maxZ = px + halfW;
      break;
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

export function computeDoorFrameCollisionBox(
  position: [number, number, number],
  rotation: [number, number, number],
): CollisionBox {
  const box = computeDoorCollisionBox(
    position, rotation, DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS);
  return {
    minX: box.min.x, maxX: box.max.x,
    minY: box.min.y, maxY: box.max.y,
    minZ: box.min.z, maxZ: box.max.z,
  };
}

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
        {!artwork.imageUrl ? (
          <PlaceholderFallback />
        ) : (
          <TextureErrorBoundary fallback={<PlaceholderFallback />}>
            <Suspense fallback={<PlaceholderFallback transparent />}>
              <meshStandardMaterial color="#FFFFFF" side={THREE.FrontSide}>
                <ArtworkTexture url={artwork.imageUrl} />
              </meshStandardMaterial>
            </Suspense>
          </TextureErrorBoundary>
        )}
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

function ParticleLayer({
  count,
  size,
  opacity,
  spread = 0.3,
}: {
  count: number;
  size: number;
  opacity: number;
  spread?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const { positions, baseX, baseZ, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const bx = new Float32Array(count);
    const bz = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      bx[i] = x;
      bz[i] = z;
      pos[i * 3] = x;
      pos[i * 3 + 1] = Math.random() * -1.2;
      pos[i * 3 + 2] = z;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, baseX: bx, baseZ: bz, phases: ph };
  }, [count, spread]);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return;
    const time = clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      let y = posAttr.getY(i);
      const speedFactor = 0.5 + ((Math.sin(phase) + 1) / 2) * 1.0;
      y += delta * 0.08 * speedFactor;
      if (y > 0) y = -1.2;
      posAttr.setY(i, y);
      const driftX = Math.sin(time * 0.5 + phase) * delta * 0.02;
      const driftZ = Math.cos(time * 0.4 + phase * 1.3) * delta * 0.02;
      let x = posAttr.getX(i) + driftX;
      let z = posAttr.getZ(i) + driftZ;
      const maxOff = spread * 0.5;
      x = baseX[i] + Math.max(-maxOff, Math.min(maxOff, x - baseX[i]));
      z = baseZ[i] + Math.max(-maxOff, Math.min(maxOff, z - baseZ[i]));
      posAttr.setX(i, x);
      posAttr.setZ(i, z);
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
        size={size}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Particles({ count = 30 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const smallCount = Math.round(count * 0.6);
  const mediumCount = Math.round(count * 0.3);
  const largeCount = Math.max(0, count - smallCount - mediumCount);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <ParticleLayer count={smallCount} size={0.012} opacity={0.4} />
      <ParticleLayer count={mediumCount} size={0.018} opacity={0.65} />
      <ParticleLayer count={largeCount} size={0.024} opacity={0.85} />
    </group>
  );
}

const Spotlight = React.memo(function Spotlight({ position, targetPosition, particleDensity = 1 }: SpotlightProps) {
  const coneHeight = Math.abs(position[1] - targetPosition[1]);
  const coneRadius = coneHeight * Math.tan(0.4);
  const targetRef = useRef<THREE.Object3D>(null);

  const baseCount = 30;
  const particleCount = Math.min(60, Math.max(10, Math.ceil(baseCount * particleDensity)));

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
        <Particles count={particleCount} />
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
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const openness = useRef(0);
  const lastTarget = useRef(0);

  const doorWidth = DOOR_WIDTH;
  const doorHeight = DOOR_HEIGHT;
  const frameBorderW = DOOR_FRAME_BORDER;

  useFrame((_, delta) => {
    let doorWorldPos: THREE.Vector3;
    if (groupRef.current) {
      groupRef.current.updateMatrixWorld(true);
      doorWorldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(doorWorldPos);
    } else {
      doorWorldPos = new THREE.Vector3(...position);
    }
    const dist = camera.position.distanceTo(doorWorldPos);

    let targetOpenness: number;
    if (dist < DOOR_OPEN_THRESHOLD) {
      targetOpenness = 1;
    } else if (dist > DOOR_CLOSE_THRESHOLD) {
      targetOpenness = 0;
    } else {
      targetOpenness = lastTarget.current;
    }
    lastTarget.current = targetOpenness;

    const rawDelta = targetOpenness - openness.current;
    const maxStep = Math.min(DOOR_MAX_STEP, DOOR_SPEED * delta);
    const clampedDelta = THREE.MathUtils.clamp(rawDelta, -maxStep, maxStep);
    openness.current += clampedDelta;

    if (leftDoorRef.current) {
      leftDoorRef.current.position.x = -doorWidth / 4 - (openness.current * doorWidth / 2);
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.position.x = doorWidth / 4 + (openness.current * doorWidth / 2);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Door collision volume (frame, not opening)
          AABB: x in [-(doorWidth/2+frameBorderW), doorWidth/2+frameBorderW],
          y in [0, doorHeight+frameBorderW],
          z in [-(WALL_THICKNESS+0.02)/2, (WALL_THICKNESS+0.02)/2
          Use computeDoorCollisionBox() to get world-space AABB for this door */}
      <mesh position={[0, doorHeight / 2 + frameBorderW / 2, 0]}>
        <boxGeometry args={[doorWidth + frameBorderW * 2, frameBorderW, DOOR_FRAME_DEPTH]} />
        <meshStandardMaterial color={GOLD_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-(doorWidth / 2 + frameBorderW / 2), doorHeight / 2, 0]}>
        <boxGeometry args={[frameBorderW, doorHeight, DOOR_FRAME_DEPTH]} />
        <meshStandardMaterial color={GOLD_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[(doorWidth / 2 + frameBorderW / 2), doorHeight / 2, 0]}>
        <boxGeometry args={[frameBorderW, doorHeight, DOOR_FRAME_DEPTH]} />
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
  const totalArtworks = (hall.artworks ?? []).length;

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
        <Spotlight
          key={s.key}
          position={s.lightPos}
          targetPosition={s.targetPos}
        />
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

function PlayerController({ hallWidth, hallHeight, hallDepth, collisionBoxes, onCollisionFlash }: {
  hallWidth: number;
  hallHeight: number;
  hallDepth: number;
  collisionBoxes?: CollisionBox[];
  onCollisionFlash: (flash: boolean) => void;
}) {
  const { groupRef, collisionFlash } = useGalleryControls({
    hallWidth,
    hallHeight,
    hallDepth,
    collisionBoxes,
  });

  const { camera } = useThree();

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.add(camera);
      camera.position.set(0, 0, 0);
      camera.rotation.set(0, 0, 0);
      camera.quaternion.identity();
      camera.updateMatrixWorld(true);
    }
    return () => {
      if (groupRef.current) {
        groupRef.current.remove(camera);
        camera.position.set(0, 1.6, 0);
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

  const collisionBoxes = useMemo<CollisionBox[]>(() => {
    if (!activeHall) return [];
    const boxes: CollisionBox[] = [];
    for (const artwork of activeHall.artworks ?? []) {
      boxes.push(computeArtworkCollisionBox(artwork));
    }
    for (const conn of activeHall.connections ?? []) {
      let pos: [number, number, number] = [0, 0, 0];
      let rot: [number, number, number] = [0, 0, 0];
      switch (conn.direction) {
        case 'north':
          pos = [0, 0, -activeHall.depth / 2];
          rot = [0, 0, 0];
          break;
        case 'south':
          pos = [0, 0, activeHall.depth / 2];
          rot = [0, Math.PI, 0];
          break;
        case 'east':
          pos = [activeHall.width / 2, 0, 0];
          rot = [0, -Math.PI / 2, 0];
          break;
        case 'west':
          pos = [-activeHall.width / 2, 0, 0];
          rot = [0, Math.PI / 2, 0];
          break;
      }
      boxes.push(computeDoorFrameCollisionBox(pos, rot));
    }
    return boxes;
  }, [activeHall]);

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
          collisionBoxes={collisionBoxes}
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
  const [glKey, setGlKey] = useState(0);
  const [showContextLost, setShowContextLost] = useState(false);
  const fpsRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCollisionFlash = useCallback((flash: boolean) => {
    setCollisionFlash(flash);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let canvas: HTMLCanvasElement | null = null;
    const findCanvas = () => {
      canvas = containerRef.current?.querySelector('canvas') || null;
    };
    findCanvas();

    if (!canvas) {
      const timeoutId = setTimeout(findCanvas, 100);
      return () => clearTimeout(timeoutId);
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setShowContextLost(true);
    };

    const handleContextRestored = () => {
      setGlKey((k) => k + 1);
      setShowContextLost(false);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [glKey]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        key={glKey}
        camera={{ fov: 65, near: 0.1, far: 100, position: [0, 1.6, 0] }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={[DEFAULT_WALL_COLOR]} />
        <fog attach="fog" args={[DEFAULT_WALL_COLOR, 15, 40]} />
        <FPSCounter fpsRef={fpsRef} />
        <Suspense fallback={null}>
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

      {showContextLost && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 15, 15, 0.9)',
            zIndex: 100,
            gap: '16px',
          }}
        >
          <div style={{ fontSize: 48, color: GOLD_COLOR }}>⚠️</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#F5F0E8',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            3D渲染上下文已丢失
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#B0A898',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            请点击下方按钮重新加载页面
          </div>
          <button
            onClick={handleReload}
            style={{
              marginTop: '12px',
              padding: '12px 36px',
              fontSize: 16,
              fontWeight: 600,
              color: '#1A1A1A',
              background: GOLD_COLOR,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: '0 4px 12px rgba(197, 165, 90, 0.3)',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(197, 165, 90, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(197, 165, 90, 0.3)';
            }}
          >
            重新加载
          </button>
        </div>
      )}

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
