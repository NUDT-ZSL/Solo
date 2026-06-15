import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, SHIP_RADIUS } from './useGameStore';
import type { Asteroid, Laser, Particle, Vector3 } from './gameLogic';
import {
  v3,
  updateAsteroids,
  updateLasers,
  updateParticles,
  createExplosionParticles,
  createTailParticle,
  splitAsteroid,
  checkSphereCollision,
  getParticleRenderState,
} from './gameLogic';

const MOVE_SPEED = 0.12;
const LOOK_SENSITIVITY = 0.002;
const DRAG_SENSITIVITY = 0.005;
const SHIP_BOUND = 25;
const LASER_RADIUS = 0.1;

function generateBumpySphere(radius: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const pos = geo.attributes.position;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const noise =
      (Math.sin(seed + tmp.x * 5) + Math.cos(seed + tmp.y * 7) + Math.sin(seed + tmp.z * 3)) * 0.12;
    tmp.multiplyScalar(1 + noise);
    pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function Ship() {
  const meshRef = useRef<THREE.Group>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const cylRef = useRef<THREE.Mesh>(null);
  const { shipPosition, shipRotation, shipRoll, phase, flashVisible, isInvincible } = useGameStore();

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(shipPosition.x, shipPosition.y, shipPosition.z);
    meshRef.current.rotation.set(shipRotation.x, shipRotation.y, shipRotation.z);
    meshRef.current.rotateZ(THREE.MathUtils.degToRad(shipRoll));

    const visible = phase === 'playing' && (!isInvincible || flashVisible);
    if (coneRef.current) coneRef.current.visible = visible;
    if (cylRef.current) cylRef.current.visible = visible;
  });

  return (
    <group ref={meshRef}>
      <mesh ref={coneRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 1.5, 8]} />
        <meshStandardMaterial
          color="#00ddff"
          metalness={0.7}
          roughness={0.3}
          emissive="#003366"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh ref={cylRef} position={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.25, 0.35, 0.8, 12]} />
        <meshStandardMaterial
          color="#0099cc"
          metalness={0.8}
          roughness={0.2}
          emissive="#002244"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0.3, 0, -0.3]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.05, 0.25]} />
        <meshStandardMaterial color="#0066aa" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.3, 0, -0.3]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.05, 0.25]} />
        <meshStandardMaterial color="#0066aa" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function AsteroidMesh({ asteroid, shipPosition }: { asteroid: Asteroid; shipPosition: Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(
    () => generateBumpySphere(asteroid.radius, asteroid.seed),
    [asteroid.radius, asteroid.seed],
  );

  const outlineGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.SphereGeometry(asteroid.radius * 1.02, 16, 16));
  }, [asteroid.radius]);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(asteroid.position.x, asteroid.position.y, asteroid.position.z);
    meshRef.current.rotation.set(asteroid.rotation.x, asteroid.rotation.y, asteroid.rotation.z);

    const dist = Math.sqrt(v3.distSq(asteroid.position, shipPosition));
    if (outlineRef.current) {
      outlineRef.current.position.set(asteroid.position.x, asteroid.position.y, asteroid.position.z);
      outlineRef.current.visible = dist < 5;
    }
  });

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={asteroid.color}
          roughness={0.9}
          metalness={0.1}
          flatShading
        />
      </mesh>
      <lineSegments ref={outlineRef} geometry={outlineGeometry}>
        <lineBasicMaterial color="#ff2222" linewidth={2} />
      </lineSegments>
    </>
  );
}

function LaserMesh({ laser }: { laser: Laser }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(laser.position.x, laser.position.y, laser.position.z);
    const dir = new THREE.Vector3(laser.direction.x, laser.direction.y, laser.direction.z);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    ref.current.quaternion.copy(quat);
  });

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
      <meshBasicMaterial color="#00ddff" />
    </mesh>
  );
}

function ParticleMesh({ particle }: { particle: Particle }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current || !particle.active) return;
    const state = getParticleRenderState(particle);
    ref.current.position.set(particle.position.x, particle.position.y, particle.position.z);
    const scale = Math.max(0.01, state.size * 0.05);
    ref.current.scale.setScalar(scale);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.color.set(state.color);
    mat.opacity = Math.max(0, particle.life / particle.maxLife);
  });

  if (!particle.active) return null;

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color={particle.startColor}
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const r = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={1500}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.15} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

function CameraController() {
  const { camera } = useThree();
  const { shipPosition, cameraPitch, cameraYaw } = useGameStore();

  useFrame(() => {
    const dist = 8;
    const height = 3;
    const cx =
      shipPosition.x -
      Math.sin(cameraYaw) * Math.cos(cameraPitch) * dist;
    const cy = shipPosition.y + Math.sin(cameraPitch) * dist + height;
    const cz =
      shipPosition.z -
      Math.cos(cameraYaw) * Math.cos(cameraPitch) * dist;
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.1);
    camera.lookAt(shipPosition.x, shipPosition.y, shipPosition.z);
  });

  return null;
}

function GameLoop() {
  const keys = useRef<Record<string, boolean>>({});
  const mouseMove = useRef({ x: 0, y: 0, active: false });
  const dragging = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const tailSpawnTimer = useRef(0);
  const explosionsQueue = useRef<{ position: Vector3; count: number }[]>([]);

  const {
    phase,
    shipPosition,
    shipRotation,
    setShipPosition,
    setShipRotation,
    setShipTargetRoll,
    fireLaser,
    setLasers,
    setAsteroids,
    setParticles,
    asteroids,
    lasers,
    particles,
    takeDamage,
    destroyAsteroid,
    setCameraAngles,
    cameraPitch,
    cameraYaw,
    update,
    isInvincible,
  } = useGameStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        const s = useGameStore.getState();
        if (s.phase !== 'playing') return;
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyEuler(new THREE.Euler(s.shipRotation.x, s.shipRotation.y, 0));
        fireLaser(
          { x: s.shipPosition.x, y: s.shipPosition.y, z: s.shipPosition.z },
          { x: dir.x, y: dir.y, z: dir.z },
        );
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current.active) {
        const dx = e.clientX - dragging.current.lastX;
        const dy = e.clientY - dragging.current.lastY;
        dragging.current.lastX = e.clientX;
        dragging.current.lastY = e.clientY;
        const s = useGameStore.getState();
        setCameraAngles(
          s.cameraPitch + dy * DRAG_SENSITIVITY,
          s.cameraYaw + dx * DRAG_SENSITIVITY,
        );
      } else {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        mouseMove.current.x = (e.clientX - cx) / cx;
        mouseMove.current.y = (e.clientY - cy) / cy;
        mouseMove.current.active = true;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        dragging.current.active = true;
        dragging.current.lastX = e.clientX;
        dragging.current.lastY = e.clientY;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) dragging.current.active = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [fireLaser, setCameraAngles]);

  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.05);
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return;

    update(delta);

    let moveX = 0,
      moveY = 0;
    if (keys.current['KeyA']) moveX -= 1;
    if (keys.current['KeyD']) moveX += 1;
    if (keys.current['KeyW']) moveY += 1;
    if (keys.current['KeyS']) moveY -= 1;

    let targetRoll = 0;
    if (keys.current['KeyQ']) targetRoll = -30;
    if (keys.current['KeyE']) targetRoll = 30;
    if (targetRoll !== 0) setShipTargetRoll(targetRoll);
    else if (state.shipTargetRoll !== 0 && state.shipRollTransition >= 0.3) {
      setShipTargetRoll(0);
    }

    const yaw = state.shipRotation.y;
    const forward = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
    const right = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
    const worldUp = { x: 0, y: 1, z: 0 };

    const newPos = {
      x: state.shipPosition.x,
      y: state.shipPosition.y,
      z: state.shipPosition.z,
    };
    newPos.x += (right.x * moveX + worldUp.x * moveY + forward.x * 0) * MOVE_SPEED;
    newPos.y += (right.y * moveX + worldUp.y * moveY + forward.y * 0) * MOVE_SPEED;
    newPos.z += (right.z * moveX + worldUp.z * moveY + forward.z * 0) * MOVE_SPEED;
    newPos.x = Math.max(-SHIP_BOUND, Math.min(SHIP_BOUND, newPos.x));
    newPos.y = Math.max(-SHIP_BOUND, Math.min(SHIP_BOUND, newPos.y));
    newPos.z = Math.max(-SHIP_BOUND, Math.min(SHIP_BOUND, newPos.z));
    setShipPosition(newPos);

    const targetPitch = -mouseMove.current.y * 0.6;
    const targetYaw = cameraYaw + (dragging.current.active ? 0 : mouseMove.current.x * 0.4);
    const newRot = {
      x: state.shipRotation.x + (targetPitch - state.shipRotation.x) * 0.1,
      y: state.shipRotation.y + (targetYaw - state.shipRotation.y) * 0.08,
      z: 0,
    };
    setShipRotation(newRot);

    const updatedAsteroids = updateAsteroids(state.asteroids, newPos);
    let updatedLasers = updateLasers(state.lasers, delta);

    const destroyedAsteroidIds = new Set<string>();
    const newAsteroids: Asteroid[] = [];

    for (const laser of updatedLasers) {
      for (const ast of updatedAsteroids) {
        if (destroyedAsteroidIds.has(ast.id)) continue;
        if (checkSphereCollision(laser.position, LASER_RADIUS, ast.position, ast.radius)) {
          destroyedAsteroidIds.add(ast.id);
          destroyAsteroid(ast.id, ast.position, ast.radius);
          explosionsQueue.current.push({ position: ast.position, count: 30 });
          const frags = splitAsteroid(ast);
          newAsteroids.push(...frags);
          laser.life = 0;
          break;
        }
      }
    }

    const finalAsteroids = [
      ...updatedAsteroids.filter(a => !destroyedAsteroidIds.has(a.id)),
      ...newAsteroids,
    ];
    setAsteroids(finalAsteroids);
    updatedLasers = updatedLasers.filter(l => l.life > 0);
    setLasers(updatedLasers);

    if (!state.isInvincible) {
      for (const ast of finalAsteroids) {
        if (checkSphereCollision(newPos, SHIP_RADIUS, ast.position, ast.radius)) {
          takeDamage();
          break;
        }
      }
    }

    let updatedParticles = updateParticles(state.particles, delta);

    tailSpawnTimer.current += delta;
    if (tailSpawnTimer.current > 0.016) {
      tailSpawnTimer.current = 0;
      const backward = {
        x: Math.sin(state.shipRotation.y) * 0.2,
        y: -Math.sin(state.shipRotation.x) * 0.2,
        z: Math.cos(state.shipRotation.y),
      };
      for (let i = 0; i < 2; i++) {
        updatedParticles = createTailParticle(newPos, backward, updatedParticles);
      }
    }

    for (const exp of explosionsQueue.current) {
      updatedParticles = createExplosionParticles(exp.position, exp.count, updatedParticles);
    }
    explosionsQueue.current = [];

    setParticles(updatedParticles);
  });

  return null;
}

function SceneContent() {
  const { asteroids, lasers, particles, shipPosition, phase } = useGameStore();

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        color="#ffffff"
        castShadow={false}
      />
      <directionalLight position={[-10, -5, -10]} intensity={0.4} color="#6688ff" />

      <Starfield />

      {phase !== 'title' && <Ship />}

      {asteroids.map(a => (
        <AsteroidMesh key={a.id} asteroid={a} shipPosition={shipPosition} />
      ))}

      {lasers.map(l => (
        <LaserMesh key={l.id} laser={l} />
      ))}

      {particles
        .filter(p => p.active)
        .slice(0, 200)
        .map(p => (
          <ParticleMesh key={p.id} particle={p} />
        ))}

      <CameraController />
      <GameLoop />
    </>
  );
}

function GameCanvas() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ fov: 65, near: 0.1, far: 200, position: [0, 3, 8] }}
      style={{ background: 'linear-gradient(180deg, #050520 0%, #0a0a2e 50%, #0f0f3e 100%)', width: '100%', height: '100%' }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <fog attach="fog" args={['#0a0a2e', 40, 120]} />
      <SceneContent />
    </Canvas>
  );
}

export default GameCanvas;
