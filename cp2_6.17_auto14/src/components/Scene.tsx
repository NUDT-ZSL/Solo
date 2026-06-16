import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ROOM_CONFIG, WINDOW_CONFIGS, type WindowType, type Season } from '@/data/roomConfig';
import { useSunPosition } from '@/hooks/useSunPosition';

interface SceneProps {
  windowType: WindowType;
  orientation: number;
  time: number;
  season: Season;
}

function Room() {
  const { width, depth, height } = ROOM_CONFIG;

  return (
    <group>
      <mesh position={[0, 0, -depth / 2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={ROOM_CONFIG.wallMaterial.color} roughness={ROOM_CONFIG.wallMaterial.roughness} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0, depth / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={ROOM_CONFIG.wallMaterial.color} roughness={ROOM_CONFIG.wallMaterial.roughness} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={ROOM_CONFIG.wallMaterial.color} roughness={ROOM_CONFIG.wallMaterial.roughness} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={ROOM_CONFIG.wallMaterial.color} roughness={ROOM_CONFIG.wallMaterial.roughness} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={ROOM_CONFIG.floorMaterial.color} roughness={ROOM_CONFIG.floorMaterial.roughness} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={ROOM_CONFIG.wallMaterial.color} roughness={ROOM_CONFIG.wallMaterial.roughness} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function WindowCutout({ windowType }: { windowType: WindowType }) {
  const config = WINDOW_CONFIGS[windowType];
  const { height } = ROOM_CONFIG;
  const { depth } = ROOM_CONFIG;
  const wallZ = -depth / 2 + 0.01;

  const windowY = windowType === 'fullLength' ? -height / 2 + config.getHeight() / 2 : 0;
  const finalZ = windowType === 'skylight' ? 0 : wallZ;
  const finalY = windowType === 'skylight' ? height / 2 - 0.01 : windowY;

  if (config.shape === 'circle') {
    return (
      <mesh position={[0, finalY, finalZ]} rotation={windowType === 'skylight' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  if (config.shape === 'arch') {
    return (
      <group position={[0, finalY, finalZ]} rotation={windowType === 'skylight' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        <mesh>
          <planeGeometry args={[config.getWidth(), config.getHeight() * 0.65]} />
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, config.getHeight() * 0.65 / 2, 0]}>
          <circleGeometry args={[config.getWidth() / 2, 32, 0, Math.PI]} />
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (config.shape === 'skylight') {
    return (
      <mesh position={[0, finalY, finalZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[config.getWidth(), config.getHeight()]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, finalY, finalZ]} rotation={windowType === 'skylight' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <planeGeometry args={[config.getWidth(), config.getHeight()]} />
      <meshStandardMaterial color="#87ceeb" transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

function WindowFrame({ windowType }: { windowType: WindowType }) {
  const config = WINDOW_CONFIGS[windowType];
  const { height } = ROOM_CONFIG;
  const { depth } = ROOM_CONFIG;
  const wallZ = -depth / 2 + 0.02;

  const windowY = windowType === 'fullLength' ? -height / 2 + config.getHeight() / 2 : 0;
  const finalZ = windowType === 'skylight' ? 0 : wallZ;
  const finalY = windowType === 'skylight' ? height / 2 - 0.02 : windowY;

  const frameColor = '#4a4a4a';
  const frameThickness = 0.05;

  if (config.shape === 'circle') {
    return (
      <group position={[0, finalY, finalZ]} rotation={windowType === 'skylight' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        <mesh>
          <torusGeometry args={[1, frameThickness, 16, 64]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[frameThickness, 2, frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, frameThickness, frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      </group>
    );
  }

  if (config.shape === 'arch') {
    return (
      <group position={[0, finalY, finalZ]} rotation={windowType === 'skylight' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        <mesh position={[-config.getWidth() / 2, -config.getHeight() * 0.175, 0]}>
          <boxGeometry args={[frameThickness, config.getHeight() * 0.65, frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[config.getWidth() / 2, -config.getHeight() * 0.175, 0]}>
          <boxGeometry args={[frameThickness, config.getHeight() * 0.65, frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, -config.getHeight() * 0.65 / 2, 0]}>
          <boxGeometry args={[config.getWidth() + frameThickness, frameThickness, frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, config.getHeight() * 0.65 / 2, 0]}>
          <torusGeometry args={[config.getWidth() / 2, frameThickness, 8, 32, Math.PI]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      </group>
    );
  }

  if (config.shape === 'skylight') {
    return (
      <group position={[0, finalY, finalZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[-config.getWidth() / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, config.getHeight(), frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[config.getWidth() / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, config.getHeight(), frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, -config.getHeight() / 2, 0]}>
          <boxGeometry args={[config.getWidth() + frameThickness, frameThickness, frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, config.getHeight() / 2, 0]}>
          <boxGeometry args={[config.getWidth() + frameThickness, frameThickness, frameThickness * 2]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, finalY, finalZ]} rotation={windowType === 'skylight' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <mesh position={[-config.getWidth() / 2, 0, 0]}>
        <boxGeometry args={[frameThickness, config.getHeight(), frameThickness * 2]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[config.getWidth() / 2, 0, 0]}>
        <boxGeometry args={[frameThickness, config.getHeight(), frameThickness * 2]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[0, -config.getHeight() / 2, 0]}>
        <boxGeometry args={[config.getWidth() + frameThickness, frameThickness, frameThickness * 2]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[0, config.getHeight() / 2, 0]}>
        <boxGeometry args={[config.getWidth() + frameThickness, frameThickness, frameThickness * 2]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[config.getWidth(), frameThickness, frameThickness * 2]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
    </group>
  );
}

function LightSpot({ windowType, sunPos }: { windowType: WindowType; sunPos: { x: number; y: number; z: number; intensity: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const config = WINDOW_CONFIGS[windowType];
  const { height, depth } = ROOM_CONFIG;

  useFrame(() => {
    if (!meshRef.current) return;
  });

  const spotPosition = useMemo(() => {
    if (windowType === 'skylight') {
      const floorY = -height / 2 + 0.02;
      const lightDir = new THREE.Vector3(sunPos.x, sunPos.y, sunPos.z).normalize();
      if (lightDir.y <= 0) return [0, floorY, 0] as [number, number, number];
      const t = (height / 2 - floorY) / lightDir.y;
      const spotX = lightDir.x * t;
      const spotZ = lightDir.z * t;
      const clampedX = Math.max(-3.5, Math.min(3.5, spotX));
      const clampedZ = Math.max(-2.5, Math.min(2.5, spotZ));
      return [clampedX, floorY, clampedZ] as [number, number, number];
    }

    const floorY = -height / 2 + 0.02;
    const lightDir = new THREE.Vector3(sunPos.x, sunPos.y, sunPos.z).normalize();
    const wallZ = -depth / 2;
    if (lightDir.z >= 0) return [0, floorY, 0] as [number, number, number];
    const t = -wallZ / lightDir.z;
    const hitX = lightDir.x * t;
    const hitY = lightDir.y * t;

    if (hitY > height / 2 || hitY < -height / 2) return [0, floorY, 0] as [number, number, number];

    if (hitY >= floorY) {
      const hitFloorT = (floorY) / (lightDir.y || 0.001);
      const floorHitX = lightDir.x * hitFloorT;
      const floorHitZ = -depth / 2 + Math.abs(lightDir.z * hitFloorT);
      if (floorHitZ < depth / 2 && floorHitZ > -depth / 2) {
        return [Math.max(-3.5, Math.min(3.5, floorHitX)), floorY, floorHitZ] as [number, number, number];
      }
    }

    return [Math.max(-3.5, Math.min(3.5, hitX)), Math.max(floorY, Math.min(height / 2, hitY)), depth / 2 - 0.02] as [number, number, number];
  }, [windowType, sunPos.x, sunPos.y, sunPos.z, height, depth]);

  const spotRotation = useMemo(() => {
    if (windowType === 'skylight') {
      return [-Math.PI / 2, 0, 0] as [number, number, number];
    }
    return [0, 0, 0] as [number, number, number];
  }, [windowType]);

  const spotScale = useMemo(() => {
    const baseScale = 1 + (1 - sunPos.intensity) * 0.5;
    return [baseScale, baseScale, baseScale] as [number, number, number];
  }, [sunPos.intensity]);

  const spotOpacity = useMemo(() => {
    return 0.3 + sunPos.intensity * 0.4;
  }, [sunPos.intensity]);

  if (sunPos.intensity < 0.01) return null;

  if (config.shape === 'circle' || windowType === 'skylight') {
    const radius = windowType === 'skylight' ? 0.8 : 1;
    return (
      <mesh ref={meshRef} position={spotPosition} rotation={spotRotation} scale={spotScale}>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial
          color="#fff8dc"
          transparent
          opacity={spotOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }

  if (config.shape === 'arch') {
    return (
      <group position={spotPosition} rotation={spotRotation} scale={spotScale}>
        <mesh>
          <planeGeometry args={[1.5, 1.3]} />
          <meshBasicMaterial color="#fff8dc" transparent opacity={spotOpacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 1.3 / 2, 0]}>
          <circleGeometry args={[0.75, 32, 0, Math.PI]} />
          <meshBasicMaterial color="#fff8dc" transparent opacity={spotOpacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh ref={meshRef} position={spotPosition} rotation={spotRotation} scale={spotScale}>
      <planeGeometry args={[2, 2.8]} />
      <meshBasicMaterial
        color="#fff8dc"
        transparent
        opacity={spotOpacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SunLight({ sunPos }: { sunPos: { x: number; y: number; z: number; intensity: number } }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.set(sunPos.x, sunPos.y, sunPos.z);
      lightRef.current.intensity = sunPos.intensity * 3;
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={[sunPos.x, sunPos.y, sunPos.z]}
        intensity={sunPos.intensity * 3}
        color="#fffaf0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <ambientLight intensity={0.15 + sunPos.intensity * 0.1} color="#b0c4de" />
    </>
  );
}

function SceneContent({ windowType, orientation, time, season }: SceneProps) {
  const sunPos = useSunPosition(orientation, time, season);

  return (
    <>
      <SunLight sunPos={sunPos} />
      <Room />
      <WindowCutout windowType={windowType} />
      <WindowFrame windowType={windowType} />
      <LightSpot windowType={windowType} sunPos={sunPos} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={3}
        maxDistance={25}
        target={[0, 0, 0]}
      />
    </>
  );
}

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas
      camera={{ position: [8, 5, 8], fov: 50, near: 0.1, far: 100 }}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      style={{ background: '#1a1a2e' }}
    >
      <fog attach="fog" args={['#1a1a2e', 20, 40]} />
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;
