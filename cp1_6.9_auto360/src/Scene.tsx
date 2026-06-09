import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { PhotoData } from './api';

const MAX_RENDERED_BLOCKS = 100;
const MIN_BLOCK_SIZE = 60;
const MAX_BLOCK_SIZE = 200;

interface SceneProps {
  photos: PhotoData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface BlockInstance {
  id: string;
  basePos: THREE.Vector3;
  rotationSpeed: number;
  floatSpeed: number;
  floatAmp: number;
  floatPhase: number;
  size: number;
  colors: string[];
  thumbnail: string;
}

interface StackInstance {
  id: string;
  pos: THREE.Vector3;
  color: string;
  thumbnail: string;
  name: string;
}

function rgbToThreeColor(rgbStr: string): THREE.Color {
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return new THREE.Color(
      parseInt(match[1]) / 255,
      parseInt(match[2]) / 255,
      parseInt(match[3]) / 255
    );
  }
  return new THREE.Color(rgbStr);
}

function computeSize(fileSize: number): number {
  const minSizeKB = 10;
  const maxSizeKB = 10000;
  const kb = fileSize / 1024;
  const t = Math.min(1, Math.max(0, (kb - minSizeKB) / (maxSizeKB - minSizeKB)));
  return MIN_BLOCK_SIZE + t * (MAX_BLOCK_SIZE - MIN_BLOCK_SIZE);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function Block({
  instance,
  selected,
  onClick,
  groupOffset,
}: {
  instance: BlockInstance;
  selected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  groupOffset: { x: number; z: number };
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loaded, setLoaded] = useState(false);

  const size = instance.size / 100;
  const thickness = 0.08;
  const mainColor = useMemo(() => rgbToThreeColor(instance.colors[0]), [instance.colors]);
  const secondaryColor = useMemo(() => rgbToThreeColor(instance.colors[1] || instance.colors[0]), [instance.colors]);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      instance.thumbnail,
      (tex) => {
        if (!cancelled) {
          tex.colorSpace = THREE.SRGBColorSpace;
          setTexture(tex);
          setLoaded(true);
        }
      },
      undefined,
      () => {
        if (!cancelled) setLoaded(true);
      }
    );
    return () => {
      cancelled = true;
      if (texture) texture.dispose();
    };
  }, [instance.thumbnail]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const targetScale = selected ? 1.5 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

    meshRef.current.position.x = instance.basePos.x + groupOffset.x;
    meshRef.current.position.z = instance.basePos.z + groupOffset.z;

    if (!selected) {
      const t = state.clock.elapsedTime;
      meshRef.current.position.y =
        instance.basePos.y + Math.sin(t * instance.floatSpeed + instance.floatPhase) * instance.floatAmp;
      meshRef.current.rotation.y += delta * instance.rotationSpeed;
    } else {
      meshRef.current.position.y = instance.basePos.y + 10;
      meshRef.current.rotation.y += delta * 0.002;
    }
  });

  const materialArray = useMemo(() => {
    const sides = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.6,
      metalness: 0.1,
    });
    const back = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.5,
      metalness: 0.15,
    });
    const front = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: loaded && texture ? 0.7 : 1.0,
      roughness: 0.7,
      metalness: 0.05,
      map: texture || undefined,
    });
    return [sides, sides, sides, sides, front, back];
  }, [mainColor, secondaryColor, texture, loaded]);

  return (
    <group ref={meshRef} position={[instance.basePos.x, instance.basePos.y, instance.basePos.z]}>
      <mesh onClick={onClick} castShadow receiveShadow>
        <boxGeometry args={[size, size, thickness]} />
        <primitive object={materialArray} attach="material" />
      </mesh>
    </group>
  );
}

function StackDot({
  instance,
  onClick,
}: {
  instance: StackInstance;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = useMemo(() => rgbToThreeColor(instance.color), [instance.color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = instance.pos.y + Math.sin(t * 0.8 + instance.pos.x * 0.1) * 2;
    const targetScale = hovered ? 1.8 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
  });

  return (
    <mesh
      ref={meshRef}
      position={[instance.pos.x, instance.pos.y, instance.pos.z]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'grab';
      }}
    >
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.6 : 0.2} />
    </mesh>
  );
}

export default function Scene({ photos, selectedId, onSelect }: SceneProps) {
  const { camera } = useThree();
  const dragState = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    targetRotX: 0,
    targetRotY: 0,
    currentRotX: 0,
    currentRotY: 0,
    targetGroupX: 0,
    targetGroupZ: 0,
    currentGroupX: 0,
    currentGroupZ: 0,
  });
  const groupOffset = useRef({ x: 0, z: 0 });
  const cameraDistance = useRef(60);

  useEffect(() => {
    camera.position.set(0, 5, cameraDistance.current);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const blockInstances: BlockInstance[] = useMemo(() => {
    const rendered = photos.slice(0, MAX_RENDERED_BLOCKS);
    return rendered.map((photo, idx) => {
      const seed = idx * 9973 + 1;
      const x = (seededRandom(seed) * 2 - 1) * 150;
      const y = (seededRandom(seed + 1) * 2 - 1) * 50;
      const z = (seededRandom(seed + 2) * 2 - 1) * 150;
      return {
        id: photo.id,
        basePos: new THREE.Vector3(x / 5, y / 5, z / 5),
        rotationSpeed: 0.01 + seededRandom(seed + 3) * 0.02,
        floatSpeed: 0.1 + seededRandom(seed + 4) * 0.4,
        floatAmp: 0.5 + seededRandom(seed + 5) * 1.0,
        floatPhase: seededRandom(seed + 6) * Math.PI * 2,
        size: computeSize(photo.file_size),
        colors: photo.dominant_colors,
        thumbnail: photo.thumbnail,
      };
    });
  }, [photos]);

  const stackInstances: StackInstance[] = useMemo(() => {
    const stacked = photos.slice(MAX_RENDERED_BLOCKS);
    const cols = Math.ceil(Math.sqrt(stacked.length));
    return stacked.map((photo, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const gridSize = 35;
      const spacing = gridSize / cols;
      const px = -gridSize / 2 + col * spacing + spacing / 2 - 30;
      const pz = -gridSize / 2 + row * spacing + spacing / 2 + 30;
      return {
        id: photo.id,
        pos: new THREE.Vector3(px, 0, pz),
        color: photo.dominant_colors[0],
        thumbnail: photo.thumbnail,
        name: photo.original_name,
      };
    });
  }, [photos]);

  useFrame(() => {
    const ds = dragState.current;

    ds.currentRotX += (ds.targetRotX - ds.currentRotX) * 0.08;
    ds.currentRotY += (ds.targetRotY - ds.currentRotY) * 0.08;

    ds.currentGroupX += (ds.targetGroupX - ds.currentGroupX) * 0.08;
    ds.currentGroupZ += (ds.targetGroupZ - ds.currentGroupZ) * 0.08;

    ds.targetGroupX *= 0.9;
    ds.targetGroupZ *= 0.9;

    groupOffset.current = { x: ds.currentGroupX, z: ds.currentGroupZ };

    const radius = cameraDistance.current;
    const yOffset = Math.sin(ds.currentRotX) * radius;
    const xzRadius = Math.cos(ds.currentRotX) * radius;
    const camX = Math.sin(ds.currentRotY) * xzRadius;
    const camZ = Math.cos(ds.currentRotY) * xzRadius;

    camera.position.lerp(new THREE.Vector3(camX, yOffset + 5, camZ), 0.05);
    camera.lookAt(0, 0, 0);
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    const ds = dragState.current;
    ds.isDragging = true;
    ds.lastX = e.nativeEvent.clientX;
    ds.lastY = e.nativeEvent.clientY;
    document.body.style.cursor = 'grabbing';
  };

  const handlePointerUp = () => {
    dragState.current.isDragging = false;
    document.body.style.cursor = 'grab';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const ds = dragState.current;
    if (!ds.isDragging) return;

    const dx = e.nativeEvent.clientX - ds.lastX;
    const dy = e.nativeEvent.clientY - ds.lastY;

    ds.targetRotY += dx * 0.003;
    ds.targetRotX += dy * 0.003;
    ds.targetRotX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, ds.targetRotX));

    ds.targetGroupX += dx * 0.02;
    ds.targetGroupZ += dy * 0.02;

    ds.lastX = e.nativeEvent.clientX;
    ds.lastY = e.nativeEvent.clientY;
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[-15, 10, -10]} intensity={0.5} color="#BB86FC" />
      <pointLight position={[15, -5, 15]} intensity={0.3} color="#03DAC6" />

      <group
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <mesh position={[0, -30, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshBasicMaterial color="#121212" />
        </mesh>

        {blockInstances.map((instance) => (
          <Block
            key={instance.id}
            instance={instance}
            selected={selectedId === instance.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(selectedId === instance.id ? null : instance.id);
            }}
            groupOffset={groupOffset.current}
          />
        ))}

        {stackInstances.map((instance) => (
          <StackDot
            key={instance.id}
            instance={instance}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(instance.id);
            }}
          />
        ))}
      </group>
    </>
  );
}
