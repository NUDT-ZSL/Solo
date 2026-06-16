import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { createBridgePaths, RampPath, VEHICLE_COLORS, calculateCongestionCoefficient, easeInOutCubic } from '../utils/pathData';
import { CongestionData } from '../App';

interface SceneProps {
  trafficDensity: number;
  speedThreshold: number;
  timeSpeed: number;
  defaultCameraPosition: [number, number, number];
  resetCameraTrigger: number;
  onCongestionUpdate: (data: CongestionData) => void;
}

const SEGMENTS_PER_RAMP = 20;
const NUM_VEHICLES = 55;

interface Vehicle {
  id: number;
  rampIndex: number;
  progress: number;
  baseSpeed: number;
  color: string;
  group: THREE.Group;
}

interface RampState {
  congestion: number;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
  colorTransition: number;
}

const BridgeDeck: React.FC<{
  path: RampPath;
  curve: THREE.CatmullRomCurve3;
  rampState: RampState;
  time: number;
}> = ({ path, curve, rampState, time }) => {
  const deckRef = useRef<THREE.Mesh>(null);
  const leftRailRef = useRef<THREE.Mesh>(null);
  const rightRailRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const coneRef = useRef<THREE.Mesh>(null);

  const { deckPoints, leftRailPoints, rightRailPoints } = useMemo(() => {
    const samples = 100;
    const deck: THREE.Vector3[] = [];
    const left: THREE.Vector3[] = [];
    const right: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = curve.getPoint(t);
      const tangent = curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      deck.push(point.clone());
      left.push(point.clone().add(normal.clone().multiplyScalar(4)));
      right.push(point.clone().add(normal.clone().multiplyScalar(-4)));
    }
    return { deckPoints: deck, leftRailPoints: left, rightRailPoints: right };
  }, [curve]);

  useFrame((_, delta) => {
    if (deckRef.current) {
      const mat = deckRef.current.material as THREE.MeshStandardMaterial;
      rampState.colorTransition = Math.min(1, rampState.colorTransition + delta / 1.5);
      const t = rampState.colorTransition;
      mat.color.copy(rampState.currentColor).lerp(rampState.targetColor, t);
    }
    if (rippleRef.current) {
      const visible = rampState.congestion > 0.7;
      rippleRef.current.visible = visible;
      if (visible) {
        const mat = rippleRef.current.material as THREE.MeshBasicMaterial;
        const phase = (time % 2) / 2;
        mat.opacity = 0.2 + Math.sin(phase * Math.PI * 2) * 0.2;
        mat.opacity = Math.max(0.2, Math.min(0.4, mat.opacity));
      }
    }
    if (coneRef.current) {
      const visible = rampState.congestion > 0.7;
      coneRef.current.visible = visible;
      if (visible) {
        const midPoint = curve.getPoint(0.5);
        const floatOffset = Math.sin(time / 3 * Math.PI * 2) * 0.5;
        coneRef.current.position.set(midPoint.x, midPoint.y + 6 + floatOffset, midPoint.z);
      }
    }
  });

  const midPoint = curve.getPoint(0.5);

  return (
    <group>
      <mesh ref={deckRef}>
        <tubeGeometry args={[curve, 150, 4, 8, false]} />
        <meshStandardMaterial
          color="#333333"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      <Line
        points={leftRailPoints}
        color="#555555"
        lineWidth={3}
      />
      <Line
        points={rightRailPoints}
        color="#555555"
        lineWidth={3}
      />

      <DashedLaneMarkers curve={curve} />

      <mesh ref={rippleRef} position={[midPoint.x, midPoint.y + 0.05, midPoint.z]} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 8, 32]} />
        <meshBasicMaterial
          color="#ff0044"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={coneRef} position={[midPoint.x, midPoint.y + 6, midPoint.z]} visible={false}>
        <coneGeometry args={[2, 4, 8]} />
        <meshStandardMaterial
          color="#ffaa00"
          transparent
          opacity={0.5}
          emissive="#ffaa00"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
};

const DashedLaneMarkers: React.FC<{ curve: THREE.CatmullRomCurve3 }> = ({ curve }) => {
  const points = useMemo(() => {
    const result: THREE.Vector3[] = [];
    const samples = 200;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = curve.getPoint(t);
      const tangent = curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      result.push(point.clone().add(normal.clone().multiplyScalar(0)));
    }
    return result;
  }, [curve]);

  return (
    <Line
      points={points}
      color="#ffdd00"
      lineWidth={2}
      dashed
      dashSize={2}
      gapSize={2}
    />
  );
};

const RampTube: React.FC<{ path: RampPath; curve: THREE.CatmullRomCurve3 }> = ({ path, curve }) => {
  return (
    <mesh>
      <tubeGeometry args={[curve, 100, 0.5, 12, false]} />
      <meshStandardMaterial
        color={path.color}
        transparent
        opacity={0.6}
        emissive={path.color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
};

const Piers: React.FC<{ paths: RampPath[]; curves: THREE.CatmullRomCurve3[] }> = ({ paths, curves }) => {
  const piers = useMemo(() => {
    const result: { pos: THREE.Vector3; height: number }[] = [];
    curves.forEach((curve, idx) => {
      const numPiers = 5;
      for (let i = 1; i < numPiers - 1; i++) {
        const t = i / (numPiers - 1);
        const point = curve.getPoint(t);
        if (point.y > 1) {
          const height = Math.max(5, Math.min(8, point.y + 1));
          result.push({
            pos: new THREE.Vector3(point.x, height / 2, point.z),
            height,
          });
        }
      }
    });
    return result;
  }, [curves, paths]);

  return (
    <group>
      {piers.map((pier, i) => (
        <mesh key={i} position={pier.pos}>
          <cylinderGeometry args={[0.8, 0.8, pier.height, 12]} />
          <meshStandardMaterial color="#777777" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

const GroundGrid: React.FC = () => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <gridHelper
        args={[300, 30, '#444444', '#444444']}
        position={[0, 0.01, 0]}
      />
    </group>
  );
};

const VehicleMesh: React.FC<{ color: string }> = ({ color }) => {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1, 0.6, 0.6]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0.3, 0.35, 0]}>
        <sphereGeometry args={[0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
};

const TrafficScene: React.FC<SceneProps> = ({
  trafficDensity,
  speedThreshold,
  timeSpeed,
  defaultCameraPosition,
  resetCameraTrigger,
  onCongestionUpdate,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const [vehiclesInitialized, setVehiclesInitialized] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  const isAnimatingRef = useRef(false);
  const animStartRef = useRef(0);
  const animStartPosRef = useRef(new THREE.Vector3());
  const animStartTargetRef = useRef(new THREE.Vector3());

  const paths = useMemo(() => createBridgePaths(), []);

  const curves = useMemo(() => {
    return paths.map((path) =>
      new THREE.CatmullRomCurve3(path.controlPoints, false, 'catmullrom', 0.5)
    );
  }, [paths]);

  const curveLengths = useMemo(() => {
    return curves.map((c) => c.getLength());
  }, [curves]);

  const rampStatesRef = useRef<RampState[]>(
    paths.map(() => ({
      congestion: 0,
      targetColor: new THREE.Color('#00ff88'),
      currentColor: new THREE.Color('#00ff88'),
      colorTransition: 1,
    }))
  );

  const initializeVehicles = useCallback(() => {
    const vehicles: Vehicle[] = [];
    for (let i = 0; i < NUM_VEHICLES; i++) {
      const rampIndex = i % paths.length;
      const group = new THREE.Group();
      vehicles.push({
        id: i,
        rampIndex,
        progress: (i / NUM_VEHICLES) * 0.9 + Math.random() * 0.1,
        baseSpeed: 0.0008 + Math.random() * 0.0004,
        color: VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
        group,
      });
    }
    vehiclesRef.current = vehicles;
    setVehiclesInitialized(true);
  }, [paths.length]);

  useEffect(() => {
    initializeVehicles();
  }, [initializeVehicles]);

  useEffect(() => {
    if (resetCameraTrigger === 0) return;
    if (!controlsRef.current) return;
    isAnimatingRef.current = true;
    animStartRef.current = performance.now();
    animStartPosRef.current.copy(camera.position);
    animStartTargetRef.current.copy(controlsRef.current.target);
  }, [resetCameraTrigger, camera]);

  useFrame((state, delta) => {
    const rawTime = state.clock.getElapsedTime();

    if (controlsRef.current && isAnimatingRef.current) {
      const elapsed = (performance.now() - animStartRef.current) / 500;
      if (elapsed >= 1) {
        camera.position.set(...defaultCameraPosition);
        controlsRef.current.target.set(0, 0, 0);
        isAnimatingRef.current = false;
      } else {
        const t = easeInOutCubic(elapsed);
        const targetPos = new THREE.Vector3(...defaultCameraPosition);
        const targetLookAt = new THREE.Vector3(0, 0, 0);
        camera.position.lerpVectors(animStartPosRef.current, targetPos, t);
        controlsRef.current.target.lerpVectors(animStartTargetRef.current, targetLookAt, t);
      }
      controlsRef.current.update();
    }

    const adjustedDelta = delta * timeSpeed;
    const vehicles = vehiclesRef.current;

    let totalSpeed = 0;
    const segmentVehicles: number[][] = paths.map(() => new Array(SEGMENTS_PER_RAMP).fill(0));

    for (const vehicle of vehicles) {
      const curve = curves[vehicle.rampIndex];
      const curveLen = curveLengths[vehicle.rampIndex];
      const segmentIndex = Math.min(SEGMENTS_PER_RAMP - 1, Math.floor(vehicle.progress * SEGMENTS_PER_RAMP));
      segmentVehicles[vehicle.rampIndex][segmentIndex]++;

      const densityFactor = trafficDensity / 100;
      const congestion = densityFactor * 0.7 + (segmentVehicles[vehicle.rampIndex][segmentIndex] / 15) * 0.3;

      const minSpeed = 0.0002;
      const maxSpeed = 0.0012;
      const speedRange = maxSpeed - minSpeed;
      const adjustedSpeed = maxSpeed - congestion * speedRange;

      const effectiveSpeed = adjustedSpeed * 60 * adjustedDelta;
      vehicle.progress += effectiveSpeed;

      if (vehicle.progress >= 1) {
        vehicle.progress = 0;
      }

      const pos = curve.getPointAt(vehicle.progress);
      const tangent = curve.getTangentAt(vehicle.progress).normalize();

      vehicle.group.position.copy(pos);
      vehicle.group.lookAt(pos.clone().add(tangent));
      vehicle.group.position.y += 0.4;

      const unitsPerSec = (effectiveSpeed * curveLen) / Math.max(0.001, adjustedDelta);
      const kmh = unitsPerSec * 3.6;
      totalSpeed += kmh;
    }

    const avgSpeed = vehicles.length > 0 ? totalSpeed / vehicles.length : 0;
    let severeCongestionCount = 0;

    for (let i = 0; i < paths.length; i++) {
      let rampCongestion = 0;
      for (let s = 0; s < SEGMENTS_PER_RAMP; s++) {
        const segDensity = trafficDensity / 100;
        const vehCount = segmentVehicles[i][s];
        const segCongestion = Math.min(1, segDensity * 0.5 + (vehCount / 12) * 0.5);
        rampCongestion = Math.max(rampCongestion, segCongestion);
      }

      const rampState = rampStatesRef.current[i];
      const newTarget = rampCongestion > 0.7
        ? new THREE.Color().lerpColors(
            new THREE.Color('#00ff88'),
            new THREE.Color('#ff0044'),
            Math.min(1, (rampCongestion - 0.7) / 0.3)
          )
        : new THREE.Color('#00ff88');

      if (!rampState.targetColor.equals(newTarget)) {
        rampState.currentColor.copy(rampState.targetColor);
        rampState.targetColor.copy(newTarget);
        rampState.colorTransition = 0;
      }

      rampState.congestion = rampCongestion;
      if (rampCongestion > 0.7) severeCongestionCount++;
    }

    onCongestionUpdate({
      totalVehicles: vehicles.length,
      averageSpeed: avgSpeed,
      severeCongestionCount,
    });

    if (Math.floor(rawTime * 20) !== renderTick) {
      setRenderTick(Math.floor(rawTime * 20));
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />

      <GroundGrid />

      {paths.map((path, i) => (
        <group key={path.id}>
          <BridgeDeck
            path={path}
            curve={curves[i]}
            rampState={rampStatesRef.current[i]}
            time={performance.now() / 1000}
          />
          <RampTube path={path} curve={curves[i]} />
