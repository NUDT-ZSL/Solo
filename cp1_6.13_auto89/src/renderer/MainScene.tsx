import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSim } from '../core/SimContext';

const SCENE_WIDTH = 800;
const SCENE_DEPTH = 800;
const SCENE_HEIGHT = 400;

function Seabed() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SCENE_WIDTH, SCENE_DEPTH, 60, 60);
    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise =
        Math.sin(x * 0.02) * Math.cos(y * 0.02) * 30 +
        Math.sin(x * 0.05 + 1.5) * Math.cos(y * 0.04 + 0.8) * 15 +
        (Math.random() - 0.5) * 10;
      positions.setZ(i, noise);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -SCENE_HEIGHT / 2 - 50, 0]} geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#1a3a4a" roughness={0.9} flatShading />
    </mesh>
  );
}

function WaterVolume() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[SCENE_WIDTH, SCENE_HEIGHT, SCENE_DEPTH]} />
      <meshBasicMaterial color="#0c2340" transparent opacity={0.15} side={THREE.BackSide} />
    </mesh>
  );
}

function SonarEmitter() {
  const { sonarSystem } = useSim();
  const coneAngle = sonarSystem.getConeAngle();
  const height = 400;
  const radius = Math.tan(coneAngle) * height;

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0, -height / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[radius, height, 32, 1, true]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>
    </group>
  );
}

function SonarPulse() {
  const { sonarSystem } = useSim();
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const radius = sonarSystem.getPulseRadius();
    const opacity = sonarSystem.getPulseOpacity();
    meshRef.current.scale.setScalar(radius > 0 ? radius : 0.01);
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#00aaff" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function FishModel({ index }: { index: number }) {
  const { fishManager, sonarSystem } = useSim();
  const groupRef = useRef<THREE.Group>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const echoRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const positions = fishManager.getFishPositions();
    const pos = positions[index];
    const velocity = fishManager.getFishVelocity(index);

    groupRef.current.position.copy(pos);

    if (velocity.length() > 0.01) {
      const targetRotation = Math.atan2(velocity.x, velocity.z);
      groupRef.current.rotation.y = targetRotation;
    }

    const flashing = sonarSystem.isFishFlashing(index);
    if (bodyMaterialRef.current) {
      const targetColor = flashing ? new THREE.Color('#e67e22') : new THREE.Color('#f1c40f');
      bodyMaterialRef.current.color.lerp(targetColor, 0.2);
    }

    const echoProgress = sonarSystem.getEchoProgress(index);
    if (echoRef.current) {
      const echoScale = echoProgress * 30;
      echoRef.current.scale.setScalar(echoScale > 0 ? echoScale : 0.01);
      const mat = echoRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - echoProgress) * 0.8;
      echoRef.current.visible = echoProgress > 0 && echoProgress < 1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 3]} rotation={[0, 0, 0]}>
        <coneGeometry args={[2, 6, 8]} />
        <meshStandardMaterial ref={bodyMaterialRef} color="#f1c40f" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -3]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[2, 6, 8]} />
        <meshStandardMaterial color="#f1c40f" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh ref={echoRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FishSchool() {
  const { fishManager } = useSim();
  const count = fishManager.getFishCount();
  const fishes = useMemo(() => {
    return Array.from({ length: count }, (_, i) => i);
  }, [count]);

  return (
    <>
      {fishes.map(i => (
        <FishModel key={i} index={i} />
      ))}
    </>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 150, 0]} intensity={0.6} color="#88ccff" distance={600} />
      <pointLight position={[-200, 100, 200]} intensity={0.3} color="#6699cc" />
      <pointLight position={[200, 100, -200]} intensity={0.3} color="#6699cc" />
    </>
  );
}

function CameraController() {
  const { camera } = useThree();

  useFrame(() => {
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SceneContent() {
  const { fishManager, sonarSystem } = useSim();

  useFrame((_, delta) => {
    fishManager.update(delta);
    sonarSystem.update(delta);
  });

  return (
    <>
      <SceneLighting />
      <Seabed />
      <WaterVolume />
      <SonarEmitter />
      <SonarPulse />
      <FishSchool />
      <OrbitControls
        enablePan={false}
        minDistance={200
        maxDistance={1200}
        target={[0, 0, 0]}
      />
      <CameraController />
    </>
  );
}

export function MainScene() {
  return (
    <Canvas
      camera={{ position: [0, 200, 500], fov: 60 }}
      gl={{ antialias: true }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0b132b 0%, #1c2541 100%)',
      }}
    >
      <fog attach="fog" args={['#0c2340', 300, 1000]} />
      <SceneContent />
    </Canvas>
  );
}
