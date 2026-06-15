import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Coral } from '../engine/Coral';
import { FishSchool } from '../engine/FishSchool';
import { generateCoralData } from '../data/coralData';
import { useReefStore } from '../store/useReefStore';

function SeaFloor() {
  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(40, 40, 64, 64);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.15 + Math.sin(x * 1.2 + y * 0.8) * 0.08;
      pos.setZ(i, noise);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color="#2a1f0e"
        roughness={0.9}
        metalness={0.05}
      />
    </mesh>
  );
}

function GodRays() {
  const groupRef = useRef<THREE.Group>(null);
  const lightIntensity = useReefStore((s) => s.lightIntensity);

  const rays = useMemo(() => {
    const result = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.5;
      result.push({
        position: [Math.cos(angle) * 3, 12, Math.sin(angle) * 3] as [number, number, number],
        rotation: [0.1 * Math.sin(angle), angle, 0] as [number, number, number],
        scale: 0.8 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return result;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const ray = rays[i];
      child.position.x = ray.position[0] + Math.sin(time * 0.3 + ray.phase) * 0.5;
      child.position.z = ray.position[2] + Math.cos(time * 0.2 + ray.phase) * 0.5;
      (child as THREE.Mesh).material.opacity = (0.04 + Math.sin(time * 0.5 + ray.phase) * 0.02) * lightIntensity;
    });
  });

  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh key={i} position={ray.position} rotation={ray.rotation} scale={[ray.scale, 1, ray.scale]}>
          <cylinderGeometry args={[0.1, 2.5, 14, 8, 1, true]} />
          <meshBasicMaterial
            color="#6ec6ff"
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function CoralMeshes({ onClickCoral }: { onClickCoral: (id: string) => void }) {
  const coralsRef = useRef<Map<string, Coral>>(new Map());
  const groupRef = useRef<THREE.Group>(null);
  const currentSpeed = useReefStore((s) => s.currentSpeed);

  const coralDataList = useMemo(() => generateCoralData(), []);

  useEffect(() => {
    if (!groupRef.current) return;

    const existing = new Set<string>();
    groupRef.current.children.forEach((child) => {
      existing.add(child.userData.coralId);
    });

    for (const data of coralDataList) {
      if (existing.has(data.id)) continue;

      const coral = new Coral(data);
      coralsRef.current.set(data.id, coral);
      groupRef.current.add(coral.mesh);
    }

    return () => {
      coralsRef.current.forEach((coral) => coral.dispose());
      coralsRef.current.clear();
    };
  }, [coralDataList]);

  useFrame((_, delta) => {
    coralsRef.current.forEach((coral) => {
      coral.update(delta, currentSpeed);
    });
  });

  const handleClick = useCallback(
    (event: THREE.Event & { object: THREE.Object3D }) => {
      event.stopPropagation();
      const coralId = event.object.userData.coralId;
      if (coralId) {
        const coral = coralsRef.current.get(coralId);
        if (coral) {
          coral.triggerInteraction();
          onClickCoral(coralId);
        }
      }
    },
    [onClickCoral]
  );

  return <group ref={groupRef} onClick={handleClick} />;
}

function FishParticles() {
  const fishSchoolRef = useRef<FishSchool | null>(null);
  const currentSpeed = useReefStore((s) => s.currentSpeed);
  const fishDensity = useReefStore((s) => s.fishDensity);

  useEffect(() => {
    const fishSchool = new FishSchool();
    fishSchoolRef.current = fishSchool;
    return () => {
      fishSchool.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!fishSchoolRef.current) return;
    fishSchoolRef.current.update(delta, currentSpeed, fishDensity);
  });

  const fishGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (fishGroupRef.current && fishSchoolRef.current) {
      while (fishGroupRef.current.children.length > 0) {
        fishGroupRef.current.remove(fishGroupRef.current.children[0]);
      }
      fishGroupRef.current.add(fishSchoolRef.current.points);
    }
  }, []);

  return <group ref={fishGroupRef} />;
}

function Rocks() {
  const rocks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 6;
      result.push({
        position: [Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius] as [number, number, number],
        scale: [0.3 + Math.random() * 0.5, 0.15 + Math.random() * 0.25, 0.3 + Math.random() * 0.5] as [number, number, number],
        rotation: [0, Math.random() * Math.PI, 0] as [number, number, number],
      });
    }
    return result;
  }, []);

  return (
    <group>
      {rocks.map((rock, i) => (
        <mesh key={i} position={rock.position} scale={rock.scale} rotation={rock.rotation} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#3d2b1a" roughness={0.95} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

export default function ReefScene({ onClickCoral }: { onClickCoral: (id: string) => void }) {
  const { camera } = useThree();
  const lightIntensity = useReefStore((s) => s.lightIntensity);

  useEffect(() => {
    camera.position.set(0, 8, 16);
    camera.lookAt(0, 2, 0);
  }, [camera]);

  return (
    <>
      <fog attach="fog" args={['#0a1628', 8, 35]} />
      <color attach="background" args={['#0a1628']} />

      <ambientLight intensity={0.25 * lightIntensity} color="#4488aa" />
      <directionalLight
        position={[5, 15, 5]}
        intensity={0.8 * lightIntensity}
        color="#6ec6ff"
        castShadow
      />
      <pointLight position={[0, 10, 0]} intensity={0.4 * lightIntensity} color="#88ddff" distance={25} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI * 0.48}
        minPolarAngle={Math.PI * 0.1}
        target={[0, 2, 0]}
      />

      <SeaFloor />
      <CoralMeshes onClickCoral={onClickCoral} />
      <FishParticles />
      <GodRays />
      <Rocks />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  );
}
