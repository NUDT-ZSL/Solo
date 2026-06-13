import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { ShopInfo } from '@/types';
import { mockShops } from '@/data/mockData';

const SHOP_HEIGHT = 3;
const FLOOR_SIZE = 24;
const FLOOR_GAP = 5;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function ShopLabel({
  text,
  position,
  floorY,
  opacity,
}: {
  text: string;
  position: [number, number, number];
  floorY: number;
  opacity: number;
}) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const radius = 12;
    const padding = 16;
    ctx.beginPath();
    ctx.roundRect(padding / 2, padding / 2, canvas.width - padding, canvas.height - padding, radius);
    ctx.fill();
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    textureRef.current = texture;
    return () => {
      texture.dispose();
    };
  }, [text]);

  useFrame(() => {
    if (!spriteRef.current || !textureRef.current) return;
    const spritePos = spriteRef.current.position;
    const distance = camera.position.distanceTo(spritePos);
    const minDist = 5;
    const maxDist = 30;
    const t = Math.max(0, Math.min(1, (distance - minDist) / (maxDist - minDist)));
    const minSize = 0.6;
    const maxSize = 1.2;
    const size = maxSize - (maxSize - minSize) * t;
    spriteRef.current.scale.set(size, size * 0.25, 1);
    spriteRef.current.material.opacity = opacity * 0.95;
  });

  if (!textureRef.current) return null;

  return (
    <sprite
      ref={spriteRef}
      position={position}
      material={
        new THREE.SpriteMaterial({
          map: textureRef.current,
          transparent: true,
          opacity: opacity,
          depthTest: false,
        })
      }
      renderOrder={10}
    />
  );
}

function ShopBlock({
  shop,
  isSelected,
  opacity,
  onClick,
  floorY,
}: {
  shop: ShopInfo;
  isSelected: boolean;
  opacity: number;
  onClick: () => void;
  floorY: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const highlightRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (isSelected) {
      highlightRef.current = Math.min(highlightRef.current + delta / 0.3, 1);
    } else {
      highlightRef.current = Math.max(highlightRef.current - delta / 0.3, 0);
    }

    const t = highlightRef.current;
    mat.emissiveIntensity = t * 0.8;
    mat.emissive.setHex(0xffffff);

    const baseScale = hovered ? 1.02 : 1;
    const pulseScale = 1 + t * 0.03;
    const finalScale = baseScale * pulseScale;
    meshRef.current.scale.set(finalScale, finalScale, finalScale);

    if (glowMeshRef.current) {
      const glowMat = glowMeshRef.current.material as THREE.MeshBasicMaterial;
      glowMat.opacity = t * 0.3;
      const glowScale = 1 + t * 0.08;
      glowMeshRef.current.scale.set(glowScale, glowScale, glowScale);
    }
  });

  const labelPos: [number, number, number] = [
    shop.x + shop.width / 2,
    floorY + SHOP_HEIGHT + 0.8,
    shop.z + shop.depth / 2,
  ];

  return (
    <>
      <mesh
        ref={meshRef}
        position={[shop.x + shop.width / 2, floorY + SHOP_HEIGHT / 2, shop.z + shop.depth / 2]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[shop.width, SHOP_HEIGHT, shop.depth]} />
        <meshStandardMaterial
          color={shop.color}
          transparent
          opacity={opacity}
          roughness={0.4}
          metalness={0.1}
          emissive={shop.color}
          emissiveIntensity={0}
        />
      </mesh>

      {isSelected && (
        <mesh
          ref={glowMeshRef}
          position={[shop.x + shop.width / 2, floorY + SHOP_HEIGHT / 2, shop.z + shop.depth / 2]}
        >
          <boxGeometry args={[shop.width + 0.2, SHOP_HEIGHT + 0.2, shop.depth + 0.2]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {opacity > 0.2 && (
        <ShopLabel
          text={shop.name.slice(0, 4)}
          position={labelPos}
          floorY={floorY}
          opacity={opacity}
        />
      )}
    </>
  );
}

function GroundPlane({ floorY, opacity }: { floorY: number; opacity: number }) {
  const gridRef = useRef<THREE.Group>(null);

  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const half = FLOOR_SIZE / 2;
    for (let i = -half; i <= half; i += 2) {
      lines.push(
        <line key={`h-${i}-${floorY}`} position={[0, 0.001, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-half, 0, i, half, 0, i])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#475569" transparent opacity={0.3} />
        </line>
      );
      lines.push(
        <line key={`v-${i}-${floorY}`} position={[0, 0.001, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([i, 0, -half, i, 0, half])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#475569" transparent opacity={0.3} />
        </line>
      );
    }
    return lines;
  }, [floorY]);

  return (
    <group ref={gridRef} position={[0, floorY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial
          color="#374151"
          transparent
          opacity={0.6 * opacity}
          roughness={0.9}
        />
      </mesh>
      <group>{gridLines}</group>
    </group>
  );
}

function PottedPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.18, 0.25, 0.6, 10]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshStandardMaterial color="#15803d" roughness={0.6} />
      </mesh>
    </group>
  );
}

function CeilingLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <pointLight
        position={[0, -0.8, 0]}
        color="#fef08a"
        intensity={0.2}
        distance={10}
        decay={1.5}
      />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <coneGeometry args={[0.8, 1.5, 16, 1, true]} />
        <meshBasicMaterial
          color="#fef08a"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function FloorLevel({
  floor,
  opacity,
  selectedShopId,
  onSelectShop,
}: {
  floor: number;
  opacity: number;
  selectedShopId: string | null;
  onSelectShop: (shop: ShopInfo) => void;
}) {
  const floorY = (floor - 1) * FLOOR_GAP;
  const floorShops = useMemo(
    () => mockShops.filter((s) => s.floor === floor),
    [floor]
  );

  const corners: [number, number, number][] = useMemo(
    () => [
      [-FLOOR_SIZE / 2 + 1.2, floorY + 0.01, -FLOOR_SIZE / 2 + 1.2],
      [FLOOR_SIZE / 2 - 1.2, floorY + 0.01, -FLOOR_SIZE / 2 + 1.2],
      [-FLOOR_SIZE / 2 + 1.2, floorY + 0.01, FLOOR_SIZE / 2 - 1.2],
      [FLOOR_SIZE / 2 - 1.2, floorY + 0.01, FLOOR_SIZE / 2 - 1.2],
    ],
    [floorY]
  );

  const lightPositions: [number, number, number][] = useMemo(
    () => [
      [-6, floorY + 4.5, -6],
      [6, floorY + 4.5, -6],
      [-6, floorY + 4.5, 6],
      [6, floorY + 4.5, 6],
      [0, floorY + 4.5, 0],
    ],
    [floorY]
  );

  return (
    <group style={{ opacity }}>
      <GroundPlane floorY={floorY} opacity={opacity} />

      {floorShops.map((shop) => (
        <ShopBlock
          key={shop.id}
          shop={shop}
          isSelected={selectedShopId === shop.id}
          opacity={opacity}
          onClick={() => onSelectShop(shop)}
          floorY={floorY}
        />
      ))}

      {opacity > 0.3 &&
        corners.map((pos, i) => (
          <PottedPlant key={`plant-${floor}-${i}`} position={pos} />
        ))}

      {opacity > 0.2 &&
        lightPositions.map((pos, i) => (
          <CeilingLight key={`light-${floor}-${i}`} position={pos} />
        ))}
    </group>
  );
}

function SceneContent({
  currentFloor,
  selectedShopId,
  onSelectShop,
  targetShopId,
  onFloorChangeComplete,
}: {
  currentFloor: number;
  selectedShopId: string | null;
  onSelectShop: (shop: ShopInfo | null) => void;
  targetShopId: string | null;
  onFloorChangeComplete: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<CameraControls>(null);

  const [displayFloor, setDisplayFloor] = useState(currentFloor);
  const [prevFloor, setPrevFloor] = useState<number | null>(null);
  const [fadeProgress, setFadeProgress] = useState(1);
  const animStateRef = useRef<'idle' | 'fading'>('idle');
  const animStartRef = useRef(0);
  const targetFloorRef = useRef(currentFloor);
  const pendingTargetShopRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentFloor === displayFloor && animStateRef.current === 'idle') return;
    if (currentFloor === targetFloorRef.current && animStateRef.current !== 'idle') return;

    targetFloorRef.current = currentFloor;
    setPrevFloor(displayFloor);
    setFadeProgress(0);
    animStateRef.current = 'fading';
    animStartRef.current = performance.now();
    pendingTargetShopRef.current = targetShopId;

    const targetFloorY = (currentFloor - 1) * FLOOR_GAP;
    if (controlsRef.current) {
      controlsRef.current.flyTo(
        new THREE.Vector3(0, targetFloorY + 12, 12),
        new THREE.Vector3(0, targetFloorY + 1.5, 0),
        true
      );
    }
  }, [currentFloor, displayFloor, targetShopId]);

  useFrame(() => {
    if (animStateRef.current === 'fading') {
      const elapsed = (performance.now() - animStartRef.current) / 1000;
      const duration = 0.8;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      setFadeProgress(eased);

      if (t >= 0.5 && displayFloor !== targetFloorRef.current) {
        setDisplayFloor(targetFloorRef.current);
      }

      if (t >= 1) {
        animStateRef.current = 'idle';
        setPrevFloor(null);
        setFadeProgress(1);
        onFloorChangeComplete();
        if (pendingTargetShopRef.current) {
          const shop = mockShops.find((s) => s.id === pendingTargetShopRef.current);
          if (shop && controlsRef.current) {
            const shopPos = new THREE.Vector3(
              shop.x + shop.width / 2,
              (shop.floor - 1) * FLOOR_GAP + 5,
              shop.z + shop.depth / 2
            );
            const target = new THREE.Vector3(
              shop.x + shop.width / 2,
              (shop.floor - 1) * FLOOR_GAP + 1.5,
              shop.z + shop.depth / 2
            );
            controlsRef.current.setLookAt(
              shopPos.x + 6,
              shopPos.y + 4,
              shopPos.z + 6,
              target.x,
              target.y,
              target.z,
              true
            );
          }
          pendingTargetShopRef.current = null;
        }
      }
    }

    if (targetShopId && animStateRef.current === 'idle') {
      const shop = mockShops.find((s) => s.id === targetShopId);
      if (shop && controlsRef.current) {
        const target = new THREE.Vector3(
          shop.x + shop.width / 2,
          (shop.floor - 1) * FLOOR_GAP + 1.5,
          shop.z + shop.depth / 2
        );
        controlsRef.current.setTarget(target.x, target.y, target.z, true);
      }
    }
  });

  const handleCanvasClick = useCallback(() => {
    onSelectShop(null);
  }, [onSelectShop]);

  const currentOpacity = displayFloor === currentFloor ? 1 : fadeProgress;
  const prevOpacity = prevFloor !== null ? 1 - fadeProgress : 0;

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 25, 10]} intensity={0.3} color="#e0f2fe" />

      <group onClick={handleCanvasClick}>
        {prevFloor !== null && (
          <FloorLevel
            floor={prevFloor}
            opacity={prevOpacity}
            selectedShopId={selectedShopId}
            onSelectShop={onSelectShop}
          />
        )}

        <FloorLevel
          floor={displayFloor}
          opacity={currentOpacity}
          selectedShopId={selectedShopId}
          onSelectShop={onSelectShop}
        />
      </group>

      <CameraControls
        ref={controlsRef}
        minDistance={5}
        maxDistance={30}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
}

export default function FloorScene({
  currentFloor,
  selectedShop,
  onSelectShop,
  targetShopId,
}: {
  currentFloor: number;
  selectedShop: ShopInfo | null;
  onSelectShop: (shop: ShopInfo | null) => void;
  targetShopId: string | null;
}) {
  const initialFloorY = (currentFloor - 1) * FLOOR_GAP;

  const handleFloorChangeComplete = useCallback(() => {}, []);

  return (
    <Canvas
      camera={{
        position: [0, initialFloorY + 12, 12],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      style={{
        background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
        width: '100%',
        height: '100%',
      }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <SceneContent
        currentFloor={currentFloor}
        selectedShopId={selectedShop?.id ?? null}
        onSelectShop={onSelectShop}
        targetShopId={targetShopId}
        onFloorChangeComplete={handleFloorChangeComplete}
      />
    </Canvas>
  );
}
