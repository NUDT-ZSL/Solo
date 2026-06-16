import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTrafficStore } from '../store/trafficStore';
import { Vehicle, TrafficLight, LightColor } from '../utils/trafficLogic';

const GROUND_SIZE = 60;
const ROAD_WIDTH = 9.6;
const LANE_WIDTH = 1.2;
const LANE_MARKER_LENGTH = 1.5;
const LANE_MARKER_GAP = 1;
const SIDEWALK_WIDTH = 3;
const INTERSECTION_HALF_SIZE = 4.8;

const LIGHT_COLORS: Record<LightColor, string> = {
  red: '#ff4757',
  yellow: '#ffa502',
  green: '#2ed573'
};

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial color="#2d3436" />
    </mesh>
  );
}

function Sidewalks() {
  const sidewalkPositions = useMemo(() => [
    { x: 0, z: -(ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), rotY: 0 },
    { x: 0, z: (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), rotY: 0 },
    { x: -(ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), z: 0, rotY: Math.PI / 2 },
    { x: (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), z: 0, rotY: Math.PI / 2 }
  ], []);

  return (
    <>
      {sidewalkPositions.map((pos, i) => (
        <mesh key={i} position={[pos.x, 0.01, pos.z]} rotation={[-Math.PI / 2, pos.rotY, 0]} receiveShadow>
          <planeGeometry args={[GROUND_SIZE - ROAD_WIDTH, SIDEWALK_WIDTH]} />
          <meshStandardMaterial color="#b2bec3" />
        </mesh>
      ))}
    </>
  );
}

function LaneMarkers() {
  const markers = useMemo(() => {
    const result: Array<{ x: number; z: number; rotY: number }> = [];
    
    for (let lane = -3; lane <= 3; lane += 2) {
      const x = lane * LANE_WIDTH;
      for (let z = -GROUND_SIZE / 2; z < -INTERSECTION_HALF_SIZE; z += LANE_MARKER_LENGTH + LANE_MARKER_GAP) {
        result.push({ x, z, rotY: 0 });
      }
      for (let z = INTERSECTION_HALF_SIZE; z < GROUND_SIZE / 2; z += LANE_MARKER_LENGTH + LANE_MARKER_GAP) {
        result.push({ x, z, rotY: 0 });
      }
    }
    
    for (let lane = -3; lane <= 3; lane += 2) {
      const z = lane * LANE_WIDTH;
      for (let x = -GROUND_SIZE / 2; x < -INTERSECTION_HALF_SIZE; x += LANE_MARKER_LENGTH + LANE_MARKER_GAP) {
        result.push({ x, z, rotY: Math.PI / 2 });
      }
      for (let x = INTERSECTION_HALF_SIZE; x < GROUND_SIZE / 2; x += LANE_MARKER_LENGTH + LANE_MARKER_GAP) {
        result.push({ x, z, rotY: Math.PI / 2 });
      }
    }
    
    return result;
  }, []);

  return (
    <>
      {markers.map((m, i) => (
        <mesh key={i} position={[m.x, 0.02, m.z]} rotation={[-Math.PI / 2, m.rotY, 0]}>
          <planeGeometry args={[LANE_MARKER_LENGTH, 0.05]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </>
  );
}

function RoadEdges() {
  const edges = useMemo(() => [
    { x1: -GROUND_SIZE / 2, z1: -ROAD_WIDTH / 2, x2: GROUND_SIZE / 2, z2: -ROAD_WIDTH / 2 },
    { x1: -GROUND_SIZE / 2, z1: ROAD_WIDTH / 2, x2: GROUND_SIZE / 2, z2: ROAD_WIDTH / 2 },
    { x1: -ROAD_WIDTH / 2, z1: -GROUND_SIZE / 2, x2: -ROAD_WIDTH / 2, z2: GROUND_SIZE / 2 },
    { x1: ROAD_WIDTH / 2, z1: -GROUND_SIZE / 2, x2: ROAD_WIDTH / 2, z2: GROUND_SIZE / 2 }
  ], []);

  return (
    <>
      {edges.map((e, i) => {
        const dx = e.x2 - e.x1;
        const dz = e.z2 - e.z1;
        const length = Math.sqrt(dx * dx + dz * dz);
        const x = (e.x1 + e.x2) / 2;
        const z = (e.z1 + e.z2) / 2;
        const rotY = Math.atan2(dz, dx);
        return (
          <mesh key={i} position={[x, 0.02, z]} rotation={[-Math.PI / 2, rotY, 0]}>
            <planeGeometry args={[length, 0.05]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        );
      })}
    </>
  );
}

function CenterLines() {
  return (
    <>
      <mesh position={[0, 0.02, -GROUND_SIZE / 2 - 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, GROUND_SIZE - 9.6]} />
        <meshBasicMaterial color="#f39c12" />
      </mesh>
      <mesh position={[0, 0.02, GROUND_SIZE / 2 + 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, GROUND_SIZE - 9.6]} />
        <meshBasicMaterial color="#f39c12" />
      </mesh>
      <mesh position={[-GROUND_SIZE / 2 - 4, 0.02, 0]} rotation={[-Math.PI / 2, Math.PI / 2, 0]}>
        <planeGeometry args={[0.08, GROUND_SIZE - 9.6]} />
        <meshBasicMaterial color="#f39c12" />
      </mesh>
      <mesh position={[GROUND_SIZE / 2 + 4, 0.02, 0]} rotation={[-Math.PI / 2, Math.PI / 2, 0]}>
        <planeGeometry args={[0.08, GROUND_SIZE - 9.6]} />
        <meshBasicMaterial color="#f39c12" />
      </mesh>
    </>
  );
}

function TrafficLightPole({ position, color, intensity }: { position: [number, number, number]; color: LightColor; intensity: number }) {
  const lightRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (glowRef.current) {
      const scale = 1 + intensity * 0.3;
      glowRef.current.scale.setScalar(scale);
    }
  });

  const lightColor = LIGHT_COLORS[color];
  const glowIntensity = 0.3 + intensity * 0.7;

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh ref={lightRef} position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.8, 16]} />
        <meshStandardMaterial 
          color={lightColor} 
          emissive={lightColor} 
          emissiveIntensity={glowIntensity}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial 
          color={lightColor} 
          transparent 
          opacity={intensity * 0.3}
        />
      </mesh>
    </group>
  );
}

function TrafficLights({ trafficLight }: { trafficLight: TrafficLight }) {
  const nsIntensity = trafficLight.northSouth === 'green' || trafficLight.northSouth === 'red' || trafficLight.northSouth === 'yellow' 
    ? trafficLight.transitionProgress : 0;
  const ewIntensity = trafficLight.eastWest === 'green' || trafficLight.eastWest === 'red' || trafficLight.eastWest === 'yellow'
    ? trafficLight.transitionProgress : 0;

  return (
    <>
      <TrafficLightPole 
        position={[-INTERSECTION_HALF_SIZE - 0.5, 0, -INTERSECTION_HALF_SIZE - 0.5]} 
        color={trafficLight.northSouth} 
        intensity={nsIntensity} 
      />
      <TrafficLightPole 
        position={[INTERSECTION_HALF_SIZE + 0.5, 0, INTERSECTION_HALF_SIZE + 0.5]} 
        color={trafficLight.northSouth} 
        intensity={nsIntensity} 
      />
      <TrafficLightPole 
        position={[INTERSECTION_HALF_SIZE + 0.5, 0, -INTERSECTION_HALF_SIZE - 0.5]} 
        color={trafficLight.eastWest} 
        intensity={ewIntensity} 
      />
      <TrafficLightPole 
        position={[-INTERSECTION_HALF_SIZE - 0.5, 0, INTERSECTION_HALF_SIZE + 0.5]} 
        color={trafficLight.eastWest} 
        intensity={ewIntensity} 
      />
    </>
  );
}

function VehicleMesh({ vehicle }: { vehicle: Vehicle }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const getRotationY = (): number => {
    switch (vehicle.direction) {
      case 'north': return 0;
      case 'south': return Math.PI;
      case 'east': return Math.PI / 2;
      case 'west': return -Math.PI / 2;
    }
  };

  useFrame(() => {
    if (meshRef.current) {
      dummy.position.set(vehicle.position[0], vehicle.position[1], vehicle.position[2]);
      dummy.rotation.y = getRotationY();
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(0, dummy.matrix);
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 1]} castShadow>
      <boxGeometry args={[2, 0.6, 1]} />
      <meshStandardMaterial color={vehicle.color} />
    </instancedMesh>
  );
}

function Vehicles({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <>
      {vehicles.map(vehicle => (
        <VehicleMesh key={vehicle.id} vehicle={vehicle} />
      ))}
    </>
  );
}

function SceneContent() {
  const { vehicles, trafficLight, update } = useTrafficStore();
  const lastTime = useRef(performance.now());

  useFrame(() => {
    const now = performance.now();
    const deltaTime = (now - lastTime.current) / 1000;
    lastTime.current = now;
    update(deltaTime);
  });

  return (
    <group>
      <Ground />
      <Sidewalks />
      <RoadEdges />
      <CenterLines />
      <LaneMarkers />
      <TrafficLights trafficLight={trafficLight} />
      <Vehicles vehicles={vehicles} />
    </group>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [20, 20, 20], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <OrbitControls 
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 3}
        minDistance={15}
        maxDistance={50}
      />
      <SceneContent />
    </Canvas>
  );
}
