import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PlacedFurniture, LightingConfig } from '../logic/LogicModule';

interface SceneModuleProps {
  furnitureList: PlacedFurniture[];
  lightingConfig: LightingConfig | null;
  roomBounds: { width: number; depth: number; height: number };
  onCanvasClick: (point: { x: number; z: number }) => void;
  onCanvasDragOver: (point: { x: number; z: number }) => void;
  onDrop: () => void;
}

function generateWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseColor = '#D5B98A';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 512; i += 4) {
    const alpha = 0.03 + Math.random() * 0.05;
    ctx.strokeStyle = `rgba(139, 115, 85, ${alpha})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, i);
    for (let x = 0; x < 512; x += 10) {
      const yOffset = Math.sin(x * 0.02 + i * 0.1) * 2;
      ctx.lineTo(x, i + yOffset);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = 1 + Math.random() * 3;
    const alpha = 0.05 + Math.random() * 0.1;
    ctx.fillStyle = `rgba(101, 67, 33, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function Room({ roomBounds }: { roomBounds: { width: number; depth: number; height: number } }) {
  const woodTexture = useMemo(() => generateWoodTexture(), []);

  return (
    <group>
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomBounds.width, roomBounds.depth]} />
        <meshStandardMaterial map={woodTexture} roughness={0.8} />
      </mesh>

      <mesh receiveShadow position={[0, roomBounds.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomBounds.width, roomBounds.depth]} />
        <meshStandardMaterial color="#FDFEFE" />
      </mesh>

      <mesh receiveShadow position={[0, roomBounds.height / 2, -roomBounds.depth / 2]}>
        <planeGeometry args={[roomBounds.width, roomBounds.height]} />
        <meshStandardMaterial color="#EAECEE" side={THREE.DoubleSide} />
      </mesh>

      <mesh receiveShadow position={[0, roomBounds.height / 2, roomBounds.depth / 2]}>
        <planeGeometry args={[roomBounds.width, roomBounds.height]} />
        <meshStandardMaterial color="#EAECEE" side={THREE.DoubleSide} />
      </mesh>

      <mesh receiveShadow position={[-roomBounds.width / 2, roomBounds.height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[roomBounds.depth, roomBounds.height]} />
        <meshStandardMaterial color="#EAECEE" side={THREE.DoubleSide} />
      </mesh>

      <mesh receiveShadow position={[roomBounds.width / 2, roomBounds.height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[roomBounds.depth, roomBounds.height]} />
        <meshStandardMaterial color="#EAECEE" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FurnitureMesh({ furniture }: { furniture: PlacedFurniture }) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      const scale = furniture.isPlacing ? 1 : (0.9 + furniture.placementProgress * 0.1);
      meshRef.current.scale.setScalar(scale);
      meshRef.current.position.set(
        furniture.position.x,
        furniture.position.y,
        furniture.position.z
      );
    }
  });

  const opacity = furniture.isPlacing ? 0.7 : 1;
  const dims = furniture.template.dimensions;

  const renderGeometry = () => {
    switch (furniture.template.type) {
      case 'sofa':
        return (
          <group>
            <mesh castShadow position={[0, dims.height * 0.3, 0]}>
              <boxGeometry args={[dims.width, dims.height * 0.5, dims.depth]} />
              <meshStandardMaterial color={furniture.template.color} transparent opacity={opacity} />
            </mesh>
            <mesh castShadow position={[0, dims.height * 0.65, -dims.depth * 0.35]}>
              <boxGeometry args={[dims.width, dims.height * 0.5, dims.depth * 0.2]} />
              <meshStandardMaterial color={furniture.template.color} transparent opacity={opacity} />
            </mesh>
            <mesh castShadow position={[-dims.width * 0.4, dims.height * 0.5, 0]}>
              <boxGeometry args={[dims.depth * 0.2, dims.height * 0.4, dims.depth]} />
              <meshStandardMaterial color={furniture.template.color} transparent opacity={opacity} />
            </mesh>
            <mesh castShadow position={[dims.width * 0.4, dims.height * 0.5, 0]}>
              <boxGeometry args={[dims.depth * 0.2, dims.height * 0.4, dims.depth]} />
              <meshStandardMaterial color={furniture.template.color} transparent opacity={opacity} />
            </mesh>
          </group>
        );
      case 'coffeeTable':
        return (
          <group>
            <mesh castShadow position={[0, dims.height - 0.05, 0]}>
              <boxGeometry args={[dims.width, 0.1, dims.depth]} />
              <meshStandardMaterial color={furniture.template.color} transparent opacity={opacity} />
            </mesh>
            {[[-dims.width * 0.4, -dims.depth * 0.3], [dims.width * 0.4, -dims.depth * 0.3], [-dims.width * 0.4, dims.depth * 0.3], [dims.width * 0.4, dims.depth * 0.3]].map(([x, z], i) => (
              <mesh key={i} castShadow position={[x, dims.height * 0.4, z]}>
                <cylinderGeometry args={[0.04, 0.04, dims.height - 0.1, 8]} />
                <meshStandardMaterial color="#4A3728" transparent opacity={opacity} />
              </mesh>
            ))}
          </group>
        );
      case 'floorLamp':
        return (
          <group>
            <mesh castShadow position={[0, dims.height * 0.4, 0]}>
              <cylinderGeometry args={[0.02, 0.02, dims.height * 0.8, 16]} />
              <meshStandardMaterial color="#2C2C2C" transparent opacity={opacity} />
            </mesh>
            <mesh castShadow position={[0, dims.height * 0.05, 0]}>
              <cylinderGeometry args={[dims.radius, dims.radius, 0.05, 32]} />
              <meshStandardMaterial color="#2C2C2C" transparent opacity={opacity} />
            </mesh>
            <mesh castShadow position={[0, dims.height * 0.85, 0]}>
              <coneGeometry args={[dims.radius, dims.height * 0.25, 32, 1, true]} />
              <meshStandardMaterial color={furniture.template.color} transparent opacity={opacity * 0.8} side={THREE.DoubleSide} />
            </mesh>
            <pointLight color={furniture.template.color} intensity={0.5} distance={5} position={[0, dims.height * 0.85, 0]} />
          </group>
        );
      case 'bookshelf':
        return (
          <group>
            <mesh castShadow position={[0, dims.height / 2, 0]}>
              <boxGeometry args={[dims.width, dims.height, dims.depth]} />
              <meshStandardMaterial color={furniture.template.color} transparent opacity={opacity} />
            </mesh>
            {[0.2, 0.5, 0.8].map((y, i) => (
              <mesh key={i} castShadow position={[0, dims.height * y, 0]}>
                <boxGeometry args={[dims.width - 0.05, 0.02, dims.depth - 0.05]} />
                <meshStandardMaterial color="#6B4423" transparent opacity={opacity} />
              </mesh>
            ))}
            {[...Array(6)].map((_, i) => {
              const bookColors = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];
              return (
                <mesh key={`book-${i}`} castShadow position={[
                  -dims.width * 0.35 + (i % 3) * 0.35,
                  dims.height * 0.35 + Math.floor(i / 3) * dims.height * 0.3,
                  0
                ]}>
                  <boxGeometry args={[0.15, 0.25, dims.depth - 0.1]} />
                  <meshStandardMaterial color={bookColors[i]} transparent opacity={opacity} />
                </mesh>
              );
            })}
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <group
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {furniture.isPlacing && (
        <mesh position={[0, -furniture.position.y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[dims.width, dims.depth]} />
          <meshBasicMaterial color="#3498DB" transparent opacity={0.5} />
        </mesh>
      )}
      {renderGeometry()}
      {hovered && !furniture.isPlacing && (
        <mesh position={[0, -furniture.position.y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(dims.width, dims.depth) * 0.6, Math.max(dims.width, dims.depth) * 0.7, 32]} />
          <meshBasicMaterial color="#3498DB" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function Lighting({ config, shadowMapSize, shadowRadius }: {
  config: LightingConfig | null;
  shadowMapSize: number;
  shadowRadius: number;
}) {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const candleRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    if (candleRef.current && config?.hasCandleLight) {
      candleRef.current.intensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1 + Math.sin(Date.now() * 0.013) * 0.05;
    }
  });

  if (!config) return null;

  return (
    <>
      <ambientLight
        ref={ambientRef}
        color={config.ambientColor}
        intensity={config.ambientIntensity}
      />
      <directionalLight
        ref={directionalRef}
        color={config.directionalColor}
        intensity={config.directionalIntensity}
        position={[5, 8, 5]}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
        shadow-radius={shadowRadius}
      />
      {config.hasCandleLight && (
        <pointLight
          ref={candleRef}
          color="#FF8C00"
          intensity={0.3}
          distance={8}
          position={[0, 1, 0]}
        />
      )}
    </>
  );
}

function SceneContent({
  furnitureList,
  lightingConfig,
  roomBounds,
  onCanvasClick,
  onCanvasDragOver,
  onDrop,
  shadowMapSize,
  shadowRadius,
}: SceneModuleProps & { shadowMapSize: number; shadowRadius: number }) {
  const { raycaster, camera } = useThree();
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      updateDragPosition(e);
    };

    const handleDragLeave = () => {
      isDraggingRef.current = false;
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      isDraggingRef.current = false;
      updateDragPosition(e);
      onDrop();
    };

    const updateDragPosition = (e: DragEvent | MouseEvent) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeRef.current, intersectPoint);

      if (intersectPoint) {
        onCanvasDragOver({ x: intersectPoint.x, z: intersectPoint.z });
      }
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('dragover', handleDragOver);
      canvas.addEventListener('dragleave', handleDragLeave);
      canvas.addEventListener('drop', handleDrop);
      canvas.addEventListener('mousemove', (e) => {
        if (isDraggingRef.current) updateDragPosition(e);
      });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('dragover', handleDragOver);
        canvas.removeEventListener('dragleave', handleDragLeave);
        canvas.removeEventListener('drop', handleDrop);
      }
    };
  }, [raycaster, camera, onCanvasDragOver, onDrop]);

  return (
    <>
      <Lighting config={lightingConfig} shadowMapSize={shadowMapSize} shadowRadius={shadowRadius} />
      <Room roomBounds={roomBounds} />
      {furnitureList.map((furniture) => (
        <FurnitureMesh key={furniture.instanceId} furniture={furniture} />
      ))}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />
      <gridHelper args={[20, 20, '#cccccc', '#e0e0e0']} position={[0, 0.001, 0]} />
    </>
  );
}

export function SceneModule(props: SceneModuleProps) {
  const shadowMapSize = props.lightingConfig?.shadowSoftness === 'sharp' ? 2048 : 1024;
  const shadowRadius = props.lightingConfig?.shadowSoftness === 'soft' ? 4 : 0;

  return (
    <Canvas
      shadows
      camera={{ position: [12, 10, 12], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 20, 50]} />
      <SceneContent {...props} shadowMapSize={shadowMapSize} shadowRadius={shadowRadius} />
    </Canvas>
  );
}
