import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ProtonData, SequenceParams } from '../types';

const STAR_COUNT = 500;
const STAR_RADIUS = 12;

function StarField() {
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const col = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = STAR_RADIUS * Math.cbrt(Math.random());
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      const tint = Math.random();
      col[i * 3] = brightness * (0.8 + tint * 0.2);
      col[i * 3 + 1] = brightness * (0.85 + tint * 0.15);
      col[i * 3 + 2] = brightness;
    }
    return { positions: pos, colors: col };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={STAR_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.005}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </points>
  );
}

interface ProtonSystemProps {
  protons: ProtonData[];
  animationPhase: number;
  params: SequenceParams;
}

function ProtonSystem({ protons, animationPhase, params }: ProtonSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const arrowsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const arrowQuat = useMemo(() => new THREE.Quaternion(), []);
  const arrowVec = useMemo(() => new THREE.Vector3(), []);
  const arrowColor = useMemo(() => new THREE.Color(), []);
  const { flipAngle } = params;
  const flipRad = (flipAngle * Math.PI) / 180;
  const flipFactor = Math.sin(flipRad);

  const positions = useMemo(() => {
    const pos = new Float32Array(protons.length * 3);
    for (let i = 0; i < protons.length; i++) {
      pos[i * 3] = protons[i].x;
      pos[i * 3 + 1] = protons[i].y;
      pos[i * 3 + 2] = protons[i].z;
    }
    return pos;
  }, [protons]);

  const colors = useMemo(() => {
    const cols = new Float32Array(protons.length * 3);
    for (let i = 0; i < protons.length; i++) {
      const color = new THREE.Color(protons[i].color);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return cols;
  }, [protons]);

  useEffect(() => {
    if (!arrowsRef.current) return;
    for (let i = 0; i < protons.length; i++) {
      arrowColor.set(protons[i].color);
      arrowsRef.current.setColorAt(i, arrowColor);
    }
    arrowsRef.current.instanceColor!.needsUpdate = true;
  }, [protons, arrowColor]);

  useFrame(() => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      const positionAttr = geometry.attributes.position;
      const posArray = positionAttr.array as Float32Array;
      const colorAttr = geometry.attributes.color;
      const colArray = colorAttr.array as Float32Array;

      for (let i = 0; i < protons.length; i++) {
        const p = protons[i];
        const phase = p.phase + p.frequency * animationPhase * flipFactor * 0.5;

        const wobbleRadius = 0.02;
        const dx = Math.cos(phase) * wobbleRadius;
        const dy = Math.sin(phase) * wobbleRadius;

        posArray[i * 3] = p.x + dx;
        posArray[i * 3 + 1] = p.y + dy;

        const brightness = 0.6 + 0.4 * Math.sin(phase);
        const baseColor = new THREE.Color(p.color);
        colArray[i * 3] = baseColor.r * brightness;
        colArray[i * 3 + 1] = baseColor.g * brightness;
        colArray[i * 3 + 2] = baseColor.b * brightness;
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    }

    if (arrowsRef.current) {
      for (let i = 0; i < protons.length; i++) {
        const p = protons[i];
        const phase = p.phase + p.frequency * animationPhase * flipFactor * 0.5;
        const wobbleRadius = 0.02;
        const dx = Math.cos(phase) * wobbleRadius;
        const dy = Math.sin(phase) * wobbleRadius;

        const tiltAngle = flipRad * 0.5;
        const precessionAngle = phase;

        arrowVec.set(
          Math.sin(tiltAngle) * Math.sin(precessionAngle),
          -Math.sin(tiltAngle) * Math.cos(precessionAngle),
          Math.cos(tiltAngle)
        ).normalize();

        dummy.position.set(p.x + dx, p.y + dy, p.z + 0.01);
        dummy.quaternion.identity();
        dummy.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          arrowVec
        );
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        arrowsRef.current.setMatrixAt(i, dummy.matrix);
      }
      arrowsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={protons.length}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={protons.length}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.95}
        />
      </points>

      <instancedMesh
        ref={arrowsRef}
        args={[undefined, undefined, protons.length]}
        frustumCulled={false}
      >
        <coneGeometry args={[0.008, 0.02, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

interface SceneContentProps {
  protons: ProtonData[];
  params: SequenceParams;
  animationPhase: number;
  resetKey: number;
}

function SceneContent({ protons, params, animationPhase, resetKey }: SceneContentProps) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetKey]);

  return (
    <>
      <StarField />

      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 2]} intensity={0.8} />
      <pointLight position={[-2, -1, -2]} intensity={0.3} />

      <mesh scale={[1.2, 0.8, 0.8]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial
          color="#ffe4e1"
          transparent
          opacity={0.3}
          roughness={0.5}
          transmission={0.6}
          thickness={0.5}
          emissive="#ffe4e1"
          emissiveIntensity={0.1}
        />
      </mesh>

      <ProtonSystem
        protons={protons}
        animationPhase={animationPhase}
        params={params}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={10}
      />
    </>
  );
}

interface SceneProps {
  protons: ProtonData[];
  params: SequenceParams;
  animationPhase: number;
  resetKey: number;
}

function Scene({ protons, params, animationPhase, resetKey }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [3, 2, 3], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 8, 15]} />
      <SceneContent
        protons={protons}
        params={params}
        animationPhase={animationPhase}
        resetKey={resetKey}
      />
    </Canvas>
  );
}

export default Scene;
