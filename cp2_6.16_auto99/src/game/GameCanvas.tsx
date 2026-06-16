import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { ArtifactPosition, ArtifactType } from '@/data/types';
import { ARTIFACT_COLORS } from '@/data/types';

interface GameCanvasProps {
  onSelectArtifact: (id: string, position: ArtifactPosition) => void;
  collection: string[];
}

interface ArtifactData {
  id: string;
  type: ArtifactType;
  position: ArtifactPosition;
}

const ARTIFACTS: ArtifactData[] = [
  { id: 'artifact-1', type: '陶罐', position: { row: 0, col: 0 } },
  { id: 'artifact-2', type: '石碑', position: { row: 0, col: 1 } },
  { id: 'artifact-3', type: '玉璧', position: { row: 0, col: 2 } },
  { id: 'artifact-4', type: '陶罐', position: { row: 1, col: 0 } },
  { id: 'artifact-5', type: '石碑', position: { row: 1, col: 1 } },
  { id: 'artifact-6', type: '玉璧', position: { row: 1, col: 2 } },
  { id: 'artifact-7', type: '陶罐', position: { row: 2, col: 0 } },
  { id: 'artifact-8', type: '石碑', position: { row: 2, col: 1 } },
  { id: 'artifact-9', type: '玉璧', position: { row: 2, col: 2 } },
];

function PotteryModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <torusGeometry args={[0.2, 0.05, 16, 32]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

function SteleModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.35, 0.7, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.3, 0.15, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.1, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

function JadeDiscModel({ color }: { color: string }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.3, 0.1, 16, 64]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} emissive={color} emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 64]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.5} emissive={color} emissiveIntensity={0.05} />
      </mesh>
    </group>
  );
}

function ParticleRing({ color, count = 20, radius = 0.5 }: { color: string; count?: number; radius?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      offset: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.3,
      yOffset: (Math.random() - 0.5) * 0.3,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    particles.forEach((p, i) => {
      const angle = p.angle + time * p.speed + p.offset;
      dummy.position.set(
        Math.cos(angle) * radius,
        p.yOffset + 0.5 + Math.sin(time * 2 + p.offset) * 0.1,
        Math.sin(angle) * radius
      );
      dummy.scale.setScalar(0.03 + Math.sin(time * 3 + p.offset) * 0.01);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </instancedMesh>
  );
}

function FloatingArtifact({
  artifact,
  collected,
  onClick,
}: {
  artifact: ArtifactData;
  collected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const color = ARTIFACT_COLORS[artifact.type];

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    groupRef.current.position.y = 0.5 + Math.sin(time * 1.5 + artifact.position.row + artifact.position.col) * 0.1;
    groupRef.current.rotation.y = time * 0.3;
    if (flashing) {
      groupRef.current.scale.setScalar(1 + Math.sin(time * 30) * 0.2);
    } else {
      const targetScale = hovered ? 1.2 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (flashing) return;
    setFlashing(true);
    setTimeout(() => {
      setFlashing(false);
      onClick();
    }, 300);
  };

  const renderModel = () => {
    switch (artifact.type) {
      case '陶罐':
        return <PotteryModel color={collected ? color : '#555'} />;
      case '石碑':
        return <SteleModel color={collected ? color : '#555'} />;
      case '玉璧':
        return <JadeDiscModel color={collected ? color : '#555'} />;
    }
  };

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {renderModel()}
      <ParticleRing color={collected ? color : '#333'} />
      {collected && (
        <pointLight position={[0, 0.5, 0]} color={color} intensity={hovered ? 2 : 1} distance={2} />
      )}
    </group>
  );
}

function GridFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#2d1b4e" roughness={0.8} />
      </mesh>
      <gridHelper
        args={[6, 6, '#6b4fa0', '#4a3570']}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

function DomeBackground() {
  return (
    <mesh>
      <sphereGeometry args={[30, 32, 32]} />
      <meshBasicMaterial color="#1a0a2e" side={THREE.BackSide} transparent opacity={0.9} />
    </mesh>
  );
}

function Scene({ onSelectArtifact, collection }: GameCanvasProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 10, 5]} intensity={1} color="#ffd700" />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#6b4fa0" />

      <DomeBackground />
      <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <GridFloor />

      {ARTIFACTS.map((artifact) => {
        const x = (artifact.position.col - 1) * 2;
        const z = (artifact.position.row - 1) * 2;
        return (
          <group key={artifact.id} position={[x, 0, z]}>
            <FloatingArtifact
              artifact={artifact}
              collected={collection.includes(artifact.id)}
              onClick={() => onSelectArtifact(artifact.id, artifact.position)}
            />
          </group>
        );
      })}

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={15}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

export default function GameCanvas({ onSelectArtifact, collection }: GameCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 6, 10], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 100%)' }}
      gl={{ antialias: true, alpha: false }}
    >
      <Scene onSelectArtifact={onSelectArtifact} collection={collection} />
    </Canvas>
  );
}
