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
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -SCENE_HEIGHT / 2 - 50, 0]}
      geometry={geometry}
      receiveShadow
    >
      <meshStandardMaterial color="#1a3a4a" roughness={0.9} flatShading />
    </mesh>
  );
}

function WaterVolume() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[SCENE_WIDTH, SCENE_HEIGHT, SCENE_DEPTH]} />
      <meshBasicMaterial color="#0c2340" transparent opacity={0.12} side={THREE.BackSide} />
    </mesh>
  );
}

function SonarEmitter() {
  const { sonarSystem } = useSim();
  const coneAngle = sonarSystem.getConeAngle();
  const height = 400;
  const radius = Math.tan(coneAngle) * height;
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!pulseRef.current) return;
    const progress = sonarSystem.getPulseProgress();
    if (progress > 0 && progress < 1) {
      pulseRef.current.scale.setScalar(progress);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 * (1 - progress);
      pulseRef.current.visible = true;
    } else {
      pulseRef.current.visible = false;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0, -height / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[radius, height, 48, 1, true]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -height / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 2, radius, 48]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[4, 24, 24]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[400, 32, 32]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FishModel({ index }: { index: number }) {
  const { fishManager, sonarSystem } = useSim();
  const groupRef = useRef<THREE.Group>(null);
  const body1Ref = useRef<THREE.MeshStandardMaterial>(null);
  const body2Ref = useRef<THREE.MeshStandardMaterial>(null);
  const echoRef = useRef<THREE.Mesh>(null);

  const goldColor = useMemo(() => new THREE.Color('#f1c40f'), []);
  const flashColor = useMemo(() => new THREE.Color('#e67e22'), []);

  useFrame(() => {
    if (!groupRef.current) return;

    const positions = fishManager.getFishPositions();
    const pos = positions[index];
    const velocity = fishManager.getFishVelocity(index);

    groupRef.current.position.copy(pos);

    if (velocity.length() > 0.01) {
      const targetRotation = Math.atan2(velocity.x, velocity.z);
      const currentRotation = groupRef.current.rotation.y;
      let diff = targetRotation - currentRotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y = currentRotation + diff * 0.15;
    }

    const flashProgress = sonarSystem.getFlashProgress(index);
    const blendFactor = flashProgress < 1 ? 1 - flashProgress : 0;
    const currentColor = goldColor.clone().lerp(flashColor, blendFactor);

    if (body1Ref.current) {
      body1Ref.current.color.copy(currentColor);
    }
    if (body2Ref.current) {
      body2Ref.current.color.copy(currentColor);
    }

    const echoProgress = sonarSystem.getEchoProgress(index);
    if (echoRef.current) {
      if (echoProgress > 0 && echoProgress < 1) {
        echoRef.current.visible = true;
        echoRef.current.scale.setScalar(Math.max(0.01, echoProgress * 30));
        const mat = echoRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - echoProgress) * 0.8;
      } else {
        echoRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 3]}>
        <coneGeometry args={[2, 6, 8]} />
        <meshStandardMaterial ref={body1Ref} color="#f1c40f" metalness={0.4} roughness={0.35} emissive="#f1c40f" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0, -3]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[2, 6, 8]} />
        <meshStandardMaterial ref={body2Ref} color="#f1c40f" metalness={0.4} roughness={0.35} emissive="#f1c40f" emissiveIntensity={0.1} />
      </mesh>
      <mesh ref={echoRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
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
      <ambientLight intensity={0.35} color="#6688aa" />
      <pointLight position={[0, 150, 0]} intensity={0.7} color="#88ccff" distance={700} decay={2} />
      <pointLight position={[-250, 80, 250]} intensity={0.35} color="#6699cc" distance={500} />
      <pointLight position={[250, 80, -250]} intensity={0.35} color="#6699cc" distance={500} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#00d4ff" distance={300} />
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
      <FishSchool />
      <OrbitControls
        enablePan={false}
        minDistance={200}
        maxDistance={1200}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
      />
      <CameraController />
    </>
  );
}

export function MainScene() {
  return (
    <Canvas
      camera={{ position: [0, 200, 500], fov: 60, near: 1, far: 3000 }}
      gl={{ antialias: true }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #1a5276 0%, #0c2340 50%, #061529 100%)',
      }}
    >
      <fog attach="fog" args={['#0c2340', 400, 1100]} />
      <SceneContent />
    </Canvas>
  );
}
