import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  getElementColor,
  getAtomById,
  generateDisplacementLines,
  type Atom,
  type Bond,
} from '../logic/MoleculeEngine';

interface AtomMeshProps {
  position: [number, number, number];
  radius: number;
  color: string;
  opacity?: number;
  transparent?: boolean;
}

function AtomMesh({
  position,
  radius,
  color,
  opacity = 1,
  transparent = false,
}: AtomMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent={transparent}
        opacity={opacity}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

interface BondCylinderProps {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  color: string;
  opacity?: number;
  transparent?: boolean;
}

function BondCylinder({
  start,
  end,
  radius,
  color,
  opacity = 1,
  transparent = false,
}: BondCylinderProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { position, rotation, length } = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(endVec, startVec);
    const len = direction.length();
    const midPoint = new THREE.Vector3()
      .addVectors(startVec, endVec)
      .multiplyScalar(0.5);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    return {
      position: midPoint.toArray() as [number, number, number],
      rotation: new THREE.Euler().setFromQuaternion(quaternion),
      length: len,
    };
  }, [start, end]);

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial
        color={color}
        transparent={transparent}
        opacity={opacity}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
}

interface DisplacementLineProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  opacity: number;
}

function DisplacementLineComponent({
  start,
  end,
  color,
  opacity,
}: DisplacementLineProps) {
  return (
    <Line
      points={[start, end]}
      color={color}
      lineWidth={2}
      transparent
      opacity={opacity}
    />
  );
}

interface MoleculeGroupProps {
  atoms: Atom[];
  bonds: Bond[];
  opacity?: number;
  transparent?: boolean;
  isInitialAnimating?: boolean;
}

function MoleculeGroup({
  atoms,
  bonds,
  opacity = 1,
  transparent = false,
  isInitialAnimating = false,
}: MoleculeGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [fadeIn, setFadeIn] = useState(isInitialAnimating ? 0 : 1);

  useEffect(() => {
    if (isInitialAnimating) {
      const startTime = performance.now();
      const duration = 1000;
      let animationId: number;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setFadeIn(progress);

        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        }
      };

      animationId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationId);
    }
  }, [isInitialAnimating]);

  useFrame((_, delta) => {
    if (groupRef.current && isInitialAnimating && fadeIn < 1) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  const atomMeshes = useMemo(() => {
    return atoms.map((atom) => (
      <AtomMesh
        key={`atom-${atom.id}`}
        position={[atom.x, atom.y, atom.z]}
        radius={atom.radius}
        color={getElementColor(atom.element)}
        opacity={opacity * fadeIn}
        transparent={transparent || fadeIn < 1}
      />
    ));
  }, [atoms, opacity, fadeIn, transparent]);

  const bondMeshes = useMemo(() => {
    return bonds.map((bond, index) => {
      const atom1 = getAtomById(atoms, bond.atom1);
      const atom2 = getAtomById(atoms, bond.atom2);
      if (!atom1 || !atom2) return null;

      const start: [number, number, number] = [atom1.x, atom1.y, atom1.z];
      const end: [number, number, number] = [atom2.x, atom2.y, atom2.z];

      return (
        <BondCylinder
          key={`bond-${index}`}
          start={start}
          end={end}
          radius={0.05}
          color="#CCCCCC"
          opacity={opacity * fadeIn}
          transparent={transparent || fadeIn < 1}
        />
      );
    });
  }, [bonds, atoms, opacity, fadeIn, transparent]);

  return (
    <group ref={groupRef}>
      {atomMeshes}
      {bondMeshes}
    </group>
  );
}

interface GroundGridProps {
  size?: number;
  divisions?: number;
  color?: string;
}

function GroundGrid({
  size = 20,
  divisions = 40,
  color = '#95A5A6',
}: GroundGridProps) {
  return (
    <gridHelper
      args={[size, divisions, color, color]}
      position={[0, -2, 0]}
    >
      <meshBasicMaterial
        attach="material"
        color={color}
        transparent
        opacity={0.3}
      />
    </gridHelper>
  );
}

interface SceneContentProps {
  atoms: Atom[];
  bonds: Bond[];
  isComparisonMode: boolean;
  referenceAtoms: Atom[] | null;
  isInitialAnimating: boolean;
}

function SceneContent({
  atoms,
  bonds,
  isComparisonMode,
  referenceAtoms,
  isInitialAnimating,
}: SceneContentProps) {
  const displacementLines = useMemo(() => {
    if (!isComparisonMode || !referenceAtoms) return [];
    return generateDisplacementLines(referenceAtoms, atoms);
  }, [isComparisonMode, referenceAtoms, atoms]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#8888FF" />

      <GroundGrid />

      {isComparisonMode && referenceAtoms && (
        <MoleculeGroup
          atoms={referenceAtoms}
          bonds={bonds}
          opacity={0.5}
          transparent={true}
          isInitialAnimating={false}
        />
      )}

      <MoleculeGroup
        atoms={atoms}
        bonds={bonds}
        opacity={1}
        transparent={false}
        isInitialAnimating={isInitialAnimating}
      />

      {isComparisonMode &&
        displacementLines.map((line, index) => (
          <DisplacementLineComponent
            key={`disp-${index}`}
            start={[line.start.x, line.start.y, line.start.z]}
            end={[line.end.x, line.end.y, line.end.z]}
            color="#FFFFFF"
            opacity={0.3}
          />
        ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={20}
      />
    </>
  );
}

interface SceneProps {
  atoms: Atom[];
  bonds: Bond[];
  dihedralAtomIds: number[];
  isComparisonMode: boolean;
  referenceAtoms: Atom[] | null;
  isInitialAnimating: boolean;
}

function Scene({
  atoms,
  bonds,
  dihedralAtomIds,
  isComparisonMode,
  referenceAtoms,
  isInitialAnimating,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      frameloop="always"
    >
      <SceneContent
        atoms={atoms}
        bonds={bonds}
        isComparisonMode={isComparisonMode}
        referenceAtoms={referenceAtoms}
        isInitialAnimating={isInitialAnimating}
      />
    </Canvas>
  );
}

export default Scene;
