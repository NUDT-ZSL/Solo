import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ShopInfo } from '@/types';
import { mockShops } from '@/data/mockData';

const SHOP_HEIGHT = 3;
const FLOOR_SIZE = 24;

function ShopBlock({
  shop,
  isSelected,
  opacity,
  onClick,
}: {
  shop: ShopInfo;
  isSelected: boolean;
  opacity: number;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
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
    mat.emissiveIntensity = highlightRef.current * 0.8;
    mat.emissive.setHex(0xffffff);
    const scale = hovered ? 1.02 : 1;
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group position={[shop.x + shop.width / 2, shop.y + SHOP_HEIGHT / 2, shop.z + shop.depth / 2]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[shop.width, SHOP_HEIGHT, shop.depth]} />
        <meshStandardMaterial
          color={shop.color}
          transparent
          opacity={opacity}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      {opacity > 0.3 && (
        <Text
          position={[0, SHOP_HEIGHT / 2 + 0.5, 0]}
          fontSize={0.6}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="#000000"
          font={undefined}
        >
          {shop.name.slice(0, 4)}
        </Text>
      )}
      {isSelected && opacity > 0.5 && (
        <mesh>
          <boxGeometry args={[shop.width + 0.15, SHOP_HEIGHT + 0.15, shop.depth + 0.15]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.15 * highlightRef.current}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

function GroundPlane({ floorY }: { floorY: number }) {
  const gridRef = useRef<THREE.Group>(null);

  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const half = FLOOR_SIZE / 2;
    for (let i = -half; i <= half; i += 2) {
      lines.push(
        <line key={`h${i}-${floorY}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-half, 0.01, i, half, 0.01, i])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#475569" transparent opacity={0.3} />
        </line>
      );
      lines.push(
        <line key={`v${i}-${floorY}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([i, 0.01, -half, i, 0.01, half])}
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.6} roughness={0.9} />
      </mesh>
      {gridLines}
    </group>
  );
}

function PottedPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 8]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.6} />
      </mesh>
    </group>
  );
}

function CeilingLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <pointLight
        position={[0, -0.5, 0]}
        color="#fef08a"
        intensity={0.2}
        distance={8}
        decay={2}
      />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.15, 1, 6, 1, true]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SceneContent({
  currentFloor,
  selectedShopId,
  onSelectShop,
  targetShopId,
}: {
  currentFloor: number;
  selectedShopId: string | null;
  onSelectShop: (shop: ShopInfo | null) => void;
  targetShopId: string | null;
}) {
  const { camera } = useThree();
  const [floorOpacity, setFloorOpacity] = useState(1);
  const prevFloorRef = useRef(currentFloor);
  const animPhaseRef = useRef<'idle' | 'fadeOut' | 'fadeIn'>('idle');
  const animProgressRef = useRef(0);

  const floorShops = useMemo(
    () => mockShops.filter((s) => s.floor === currentFloor),
    [currentFloor]
  );

  useFrame((_, delta) => {
    if (prevFloorRef.current !== currentFloor) {
      animPhaseRef.current = 'fadeOut';
      animProgressRef.current = 0;
    }
    prevFloorRef.current = currentFloor;

    if (animPhaseRef.current === 'fadeOut') {
      animProgressRef.current += delta / 0.8;
      if (animProgressRef.current >= 1) {
        animProgressRef.current = 0;
        animPhaseRef.current = 'fadeIn';
      }
      setFloorOpacity(Math.max(0, 1 - animProgressRef.current));
    } else if (animPhaseRef.current === 'fadeIn') {
      animProgressRef.current += delta / 0.8;
      if (animProgressRef.current >= 1) {
        animProgressRef.current = 0;
        animPhaseRef.current = 'idle';
      }
      setFloorOpacity(Math.min(1, animProgressRef.current));
    }

    if (targetShopId) {
      const target = mockShops.find((s) => s.id === targetShopId);
      if (target) {
        const targetPos = new THREE.Vector3(
          target.x + target.width / 2,
          target.y + 5,
          target.z + target.depth / 2
        );
        camera.position.lerp(targetPos, delta * 2);
      }
    }
  });

  const handleCanvasClick = useCallback(() => {
    onSelectShop(null);
  }, [onSelectShop]);

  const floorY = (currentFloor - 1) * 5;

  const corners: [number, number, number][] = useMemo(
    () => [
      [-FLOOR_SIZE / 2 + 1, floorY + 0.01, -FLOOR_SIZE / 2 + 1],
      [FLOOR_SIZE / 2 - 1, floorY + 0.01, -FLOOR_SIZE / 2 + 1],
      [-FLOOR_SIZE / 2 + 1, floorY + 0.01, FLOOR_SIZE / 2 - 1],
      [FLOOR_SIZE / 2 - 1, floorY + 0.01, FLOOR_SIZE / 2 - 1],
    ],
    [floorY]
  );

  const lightPositions: [number, number, number][] = useMemo(
    () => [
      [-5, floorY + 6, -5],
      [5, floorY + 6, -5],
      [-5, floorY + 6, 5],
      [5, floorY + 6, 5],
      [0, floorY + 6, 0],
    ],
    [floorY]
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.3} />

      <group onClick={handleCanvasClick}>
        <GroundPlane floorY={floorY} />

        {floorShops.map((shop) => (
          <ShopBlock
            key={shop.id}
            shop={shop}
            isSelected={selectedShopId === shop.id}
            opacity={floorOpacity}
            onClick={() => onSelectShop(shop)}
          />
        ))}

        {corners.map((pos, i) => (
          <PottedPlant key={`plant-${i}`} position={pos} />
        ))}

        {lightPositions.map((pos, i) => (
          <CeilingLight key={`light-${i}`} position={pos} />
        ))}
      </group>

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={30}
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        target={[0, floorY + 1.5, 0]}
        maxPolarAngle={Math.PI / 2.2}
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
  const cameraPosition = useMemo<[number, number, number]>(
    () => [0, (currentFloor - 1) * 5 + 12, 12],
    [currentFloor]
  );

  return (
    <Canvas
      camera={{
        position: cameraPosition,
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)' }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent
        currentFloor={currentFloor}
        selectedShopId={selectedShop?.id ?? null}
        onSelectShop={onSelectShop}
        targetShopId={targetShopId}
      />
    </Canvas>
  );
}
