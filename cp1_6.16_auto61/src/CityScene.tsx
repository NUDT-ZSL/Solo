import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Building, BuildingStyle, interpolateColor, easeInOut } from './CityGenerator';

interface CitySceneProps {
  buildings: Building[];
  rotationSpeed: number;
  style: BuildingStyle;
}

function BuildingMesh({
  building,
  targetStyle,
}: {
  building: Building;
  targetStyle: BuildingStyle;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const decorationRef = useRef<THREE.Mesh>(null);
  const [currentHeight, setCurrentHeight] = useState(building.height);
  const [currentColor, setCurrentColor] = useState(building.color);
  const [currentScale, setCurrentScale] = useState(1);
  const animationRef = useRef<number | null>(null);
  const [decorGeometry, setDecorGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();
    const startHeight = currentHeight;
    const startColor = currentColor;
    const startScale = currentScale;

    const targetHeight = targetStyle === 'classical'
      ? building.height * 1.1
      : building.height;

    const r = parseInt(building.color.slice(1, 3), 16);
    const g = parseInt(building.color.slice(3, 5), 16);
    const b = parseInt(building.color.slice(5, 7), 16);
    const baseColorHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    let targetColorHex = baseColorHex;
    if (building.zone === 'center') {
      targetColorHex = interpolateColor(baseColorHex, '#1976D2', 0.3);
    } else if (building.zone === 'axis') {
      targetColorHex = interpolateColor(baseColorHex, '#0D47A1', 0.2);
    } else if (building.zone === 'suburb') {
      targetColorHex = interpolateColor(baseColorHex, '#FFD54F', 0.2);
    }

    const targetScale = targetStyle === 'classical' ? 1 : 1;

    if (targetStyle === 'classical') {
      if (building.decorationType === 'dome') {
        setDecorGeometry(new THREE.SphereGeometry(building.baseWidth * 0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2));
      } else if (building.decorationType === 'spire') {
        setDecorGeometry(new THREE.ConeGeometry(building.baseWidth * 0.3, building.decorationHeight, 8));
      }
    } else {
      if (building.decorationType === 'slope') {
        setDecorGeometry(new THREE.ConeGeometry(building.baseWidth * 0.7, building.decorationHeight || 3, 4));
      } else {
        setDecorGeometry(null);
      }
    }

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const scaleT = Math.min(elapsed / 0.5, 1);
      const colorT = Math.min(elapsed / 0.3, 1);
      const easedScaleT = easeInOut(scaleT);
      const easedColorT = easeInOut(colorT);

      const newHeight = startHeight + (targetHeight - startHeight) * easedScaleT;
      const newColor = interpolateColor(startColor, targetColorHex, easedColorT);
      const newScale = startScale + (targetScale - startScale) * easedScaleT;

      setCurrentHeight(newHeight);
      setCurrentColor(newColor);
      setCurrentScale(newScale);

      if (colorT < 1 || scaleT < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetStyle, building]);

  const decorY = currentHeight / 2 + (building.decorationHeight || 3) / 2;

  return (
    <group position={[building.x, 0, building.z]}>
      <mesh
        ref={meshRef}
        position={[0, currentHeight / 2, 0]}
        scale={[currentScale, 1, currentScale]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[building.baseWidth, currentHeight, building.baseDepth]} />
        <meshStandardMaterial
          color={currentColor}
          roughness={0.7}
          metalness={0.3}
          envMapIntensity={0.6}
        />
      </mesh>
      {decorGeometry && (
        <mesh
          ref={decorationRef}
          position={[0, decorY, 0]}
          scale={[currentScale, 1, currentScale]}
          castShadow
        >
          <primitive object={decorGeometry} attach="geometry" />
          <meshStandardMaterial
            color={interpolateColor(currentColor, '#FFFFFF', 0.1)}
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
      )}
    </group>
  );
}

function Ground({ gridSize }: { gridSize: number }) {
  const size = gridSize * 8 + 20;
  const gridRef = useRef<THREE.GridHelper>(null);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.material.opacity = 0.4;
      gridRef.current.material.transparent = true;
    }
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#1A2226" roughness={0.9} />
      </mesh>
      <gridHelper
        ref={gridRef}
        args={[size, gridSize * 2, '#2196F3', '#2196F3']}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

function AutoRotate({ speed }: { speed: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (speed > 0 && controlsRef.current) {
      const angle = speed * delta * 0.1;
      const radius = Math.sqrt(
        camera.position.x ** 2 + camera.position.z ** 2
      );
      const currentAngle = Math.atan2(camera.position.z, camera.position.x);
      const newAngle = currentAngle + angle;
      camera.position.x = Math.cos(newAngle) * radius;
      camera.position.z = Math.sin(newAngle) * radius;
      camera.lookAt(0, 0, 0);
    }
  });

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />;
}

function SceneContent({
  buildings,
  rotationSpeed,
  style,
  gridSize,
}: CitySceneProps & { gridSize: number }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      <Ground gridSize={gridSize} />
      {buildings.map((building) => (
        <BuildingMesh key={building.id} building={building} targetStyle={style} />
      ))}
      <AutoRotate speed={rotationSpeed} />
    </>
  );
}

export default function CityScene({
  buildings,
  rotationSpeed,
  style,
}: CitySceneProps) {
  const gridSize = Math.ceil(Math.sqrt(buildings.length / 0.7)) + 5;

  return (
    <Canvas
      shadows
      camera={{ position: [150, 100, 150], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0D1218']} />
      <fog attach="fog" args={['#0D1218', 200, 500]} />
      <SceneContent
        buildings={buildings}
        rotationSpeed={rotationSpeed}
        style={style}
        gridSize={gridSize}
      />
    </Canvas>
  );
}
