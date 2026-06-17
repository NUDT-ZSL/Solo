import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getMolecule, getElementInfo, DisplayMode, Atom, Bond } from './MoleculeData';
import { useMoleculeStore } from './store';

const SCALE = 0.25;

function getAtomRadius(element: string, mode: DisplayMode): number {
  const info = getElementInfo(element);
  if (mode === 'ballStick') {
    return info.covalentRadius * SCALE * 1.2;
  }
  if (mode === 'spaceFill') {
    return info.vdwRadius * SCALE;
  }
  return 0.06;
}

function getAtomColor(element: string, mode: DisplayMode): string {
  if (mode === 'wireframe') return '#00BFFF';
  return getElementInfo(element).color;
}

function getBondRadius(mode: DisplayMode, order: number): number {
  if (mode === 'spaceFill') return 0;
  if (mode === 'wireframe') return 0.015;
  return 0.04 * order;
}

function getBondColor(mode: DisplayMode): string {
  if (mode === 'wireframe') return '#00BFFF';
  return '#A0A0A0';
}

interface AtomMeshProps {
  atom: Atom;
  index: number;
  mode: DisplayMode;
}

const AtomMesh: React.FC<AtomMeshProps> = ({ atom, index, mode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const { setSelectedAtom, setHoveredAtom, hoveredAtom, selectedAtom } = useMoleculeStore();
  const [hovered, setHovered] = React.useState(false);

  const targetRadius = getAtomRadius(atom.element, mode);
  const targetColor = getAtomColor(atom.element, mode);
  const isWireframe = mode === 'wireframe';

  const currentRadius = useRef(targetRadius);
  const currentColor = useRef(new THREE.Color(targetColor));
  const currentOpacity = useRef(isWireframe ? 0.8 : 1.0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = 4 * delta;
    currentRadius.current = THREE.MathUtils.lerp(currentRadius.current, targetRadius, speed);
    currentColor.current.lerp(new THREE.Color(targetColor), speed);

    const mat = meshRef.current.material as THREE.MeshPhongMaterial;
    mat.color.copy(currentColor.current);
    const s = currentRadius.current / 0.2;
    meshRef.current.scale.setScalar(s);

    if (mode === 'wireframe') {
      currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, 0.8, speed);
    } else {
      currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, 1.0, speed);
    }
    mat.opacity = currentOpacity.current;

    if (haloRef.current) {
      const isHovered = hoveredAtom === index;
      const targetHaloOpacity = isHovered ? 0.2 : 0;
      const haloMat = haloRef.current.material as THREE.MeshBasicMaterial;
      haloMat.opacity = THREE.MathUtils.lerp(haloMat.opacity, targetHaloOpacity, speed * 3);
      const haloScale = (currentRadius.current * 1.3) / 0.2;
      haloRef.current.scale.setScalar(haloScale);
    }
  });

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    const info = getElementInfo(atom.element);
    setSelectedAtom({
      element: info.symbol,
      name: `${info.name} (${info.nameEn})`,
      atomicNumber: info.atomicNumber,
      x: parseFloat(atom.x.toFixed(2)),
      y: parseFloat(atom.y.toFixed(2)),
      z: parseFloat(atom.z.toFixed(2)),
    });
  };

  const handlePointerOver = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    setHovered(true);
    setHoveredAtom(index);
  };

  const handlePointerOut = () => {
    setHovered(false);
    setHoveredAtom(null);
  };

  const info = getElementInfo(atom.element);

  return (
    <group position={[atom.x * SCALE, atom.y * SCALE, atom.z * SCALE]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={[1, 1, 1]}
      >
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshPhongMaterial
          color={targetColor}
          shininess={80}
          transparent
          opacity={1}
        />
      </mesh>
      <mesh ref={haloRef} scale={[1, 1, 1]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial
          color={info.color}
          transparent
          opacity={0}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

interface BondMeshProps {
  bond: Bond;
  atoms: Atom[];
  mode: DisplayMode;
}

const BondMesh: React.FC<BondMeshProps> = ({ bond, atoms, mode }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const a1 = atoms[bond.atom1Index];
  const a2 = atoms[bond.atom2Index];

  const start = useMemo(() => new THREE.Vector3(a1.x * SCALE, a1.y * SCALE, a1.z * SCALE), [a1.x, a1.y, a1.z]);
  const end = useMemo(() => new THREE.Vector3(a2.x * SCALE, a2.y * SCALE, a2.z * SCALE), [a2.x, a2.y, a2.z]);

  const targetRadius = getBondRadius(mode, bond.order);
  const currentRadius = useRef(targetRadius);
  const targetColor = getBondColor(mode);
  const currentColor = useRef(new THREE.Color(targetColor));
  const targetOpacity = mode === 'spaceFill' ? 0 : 1;
  const currentOpacity = useRef(1);

  const { position, quaternion, length } = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: mid, quaternion: quat, length: len };
  }, [start, end]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = 4 * delta;
    currentRadius.current = THREE.MathUtils.lerp(currentRadius.current, targetRadius, speed);
    currentColor.current.lerp(new THREE.Color(targetColor), speed);

    const mat = meshRef.current.material as THREE.MeshPhongMaterial;
    mat.color.copy(currentColor.current);

    const s = currentRadius.current / 0.04;
    meshRef.current.scale.set(s, 1, s);

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, speed);
    mat.opacity = currentOpacity.current;
    mat.transparent = currentOpacity.current < 0.99;
  });

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshPhongMaterial color={targetColor} shininess={30} transparent opacity={1} />
    </mesh>
  );
};

interface MoleculeGroupProps {
  moleculeName: string;
  mode: DisplayMode;
}

const MoleculeGroup: React.FC<MoleculeGroupProps> = ({ moleculeName, mode }) => {
  const mol = getMolecule(moleculeName);
  const { setLoading } = useMoleculeStore();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [moleculeName, setLoading]);

  if (!mol) return null;

  return (
    <group>
      {mol.atoms.map((atom, i) => (
        <AtomMesh key={`${moleculeName}-atom-${i}`} atom={atom} index={i} mode={mode} />
      ))}
      {mol.bonds.map((bond, i) => (
        <BondMesh key={`${moleculeName}-bond-${i}`} bond={bond} atoms={mol.atoms} mode={mode} />
      ))}
    </group>
  );
};

const GradientBackground: React.FC = () => {
  const { scene } = useThree();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0A0A2E');
    gradient.addColorStop(1, '#1A0A2E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    scene.background = tex;
    return () => { scene.background = null; };
  }, [scene]);

  return null;
};

const ClickHandler: React.FC = () => {
  const { setSelectedAtom } = useMoleculeStore();
  return (
    <mesh
      visible={false}
      position={[0, 0, 0]}
      onClick={() => setSelectedAtom(null)}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial />
    </mesh>
  );
};

const SceneContent: React.FC = () => {
  const { currentMolecule, displayMode } = useMoleculeStore();

  return (
    <>
      <GradientBackground />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -3, -5]} intensity={0.8} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={5}
        enablePan
      />
      <MoleculeGroup moleculeName={currentMolecule} mode={displayMode} />
      <ClickHandler />
    </>
  );
};

const Scene: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
};

export default Scene;
