import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getMolecule, getElementInfo, DisplayMode, Atom, Bond } from './MoleculeData';
import { useMoleculeStore, VisualQuality } from './store';

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
  quality: VisualQuality;
}

const AtomMesh: React.FC<AtomMeshProps> = ({ atom, index, mode, quality }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const highlightsRef = useRef<THREE.Group>(null);
  const { setSelectedAtom, setHoveredAtom, hoveredAtom } = useMoleculeStore();

  const targetRadius = getAtomRadius(atom.element, mode);
  const targetColor = getAtomColor(atom.element, mode);
  const isWireframe = mode === 'wireframe';
  const isEnhanced = quality === 'enhanced';

  const currentRadius = useRef(targetRadius);
  const currentColor = useRef(new THREE.Color(targetColor));
  const currentOpacity = useRef(isWireframe ? 0.8 : 1.0);

  const info = getElementInfo(atom.element);

  const highlightPositions = useMemo(() => {
    const positions: { pos: [number, number, number]; size: number }[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.2;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions.push({
        pos: [x, y, z] as [number, number, number],
        size: 0.015 + Math.random() * 0.025,
      });
    }
    return positions;
  }, [atom.element, index]);

  useFrame((state, delta) => {
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
      const targetHaloOpacity = isHovered ? 0.25 : 0;
      const haloMat = haloRef.current.material as THREE.MeshBasicMaterial;
      haloMat.opacity = THREE.MathUtils.lerp(haloMat.opacity, targetHaloOpacity, speed * 3);
      const haloScale = (currentRadius.current * 1.3) / 0.2;
      haloRef.current.scale.setScalar(haloScale);
    }

    if (glowRef.current && isEnhanced) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetGlowOpacity = isWireframe ? 0 : 0.15;
      glowMat.opacity = THREE.MathUtils.lerp(glowMat.opacity, targetGlowOpacity, speed);
      const glowScale = (currentRadius.current * 1.6) / 0.2;
      glowRef.current.scale.setScalar(glowScale);
      glowRef.current.visible = !isWireframe;
    }

    if (highlightsRef.current && isEnhanced && !isWireframe) {
      const time = state.clock.elapsedTime;
      highlightsRef.current.children.forEach((child, i) => {
        const highlight = child as THREE.Mesh;
        const hMat = highlight.material as THREE.MeshBasicMaterial;
        const flicker = 0.7 + 0.3 * Math.sin(time * 2 + i * 1.5);
        hMat.opacity = 0.6 * flicker;
      });
      highlightsRef.current.visible = true;
      highlightsRef.current.scale.setScalar(s);
    } else if (highlightsRef.current) {
      highlightsRef.current.visible = false;
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
    setHoveredAtom(index);
  };

  const handlePointerOut = () => {
    setHoveredAtom(null);
  };

  return (
    <group position={[atom.x * SCALE, atom.y * SCALE, atom.z * SCALE]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={[1, 1, 1]}
      >
        <sphereGeometry args={[0.2, 48, 48]} />
        <meshPhongMaterial
          color={targetColor}
          shininess={80}
          specular={new THREE.Color(0xffffff)}
          specularIntensity={0.3}
          transparent
          opacity={1}
        />
      </mesh>

      {isEnhanced && (
        <mesh ref={glowRef} scale={[1, 1, 1]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshBasicMaterial
            color={info.color}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {isEnhanced && !isWireframe && (
        <group ref={highlightsRef}>
          {highlightPositions.map((hp, i) => (
            <mesh key={i} position={hp.pos}>
              <sphereGeometry args={[hp.size, 8, 8]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}

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
  quality: VisualQuality;
}

const BondMesh: React.FC<BondMeshProps> = ({ bond, atoms, mode, quality }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cap1Ref = useRef<THREE.Mesh>(null);
  const cap2Ref = useRef<THREE.Mesh>(null);

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
  const isEnhanced = quality === 'enhanced';

  const { position, quaternion, length } = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: mid, quaternion: quat, length: len };
  }, [start, end]);

  const capRadius = getAtomRadius(a1.element, mode) * 0.12;
  const capColor1 = getAtomColor(a1.element, mode);
  const capColor2 = getAtomColor(a2.element, mode);

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

    if (cap1Ref.current && isEnhanced && mode === 'ballStick') {
      const capMat = cap1Ref.current.material as THREE.MeshPhongMaterial;
      const capScale = (currentRadius.current * 1.3) / 0.04;
      cap1Ref.current.scale.setScalar(capScale);
      capMat.opacity = currentOpacity.current;
      capMat.color.set(capColor1);
      cap1Ref.current.visible = true;
    } else if (cap1Ref.current) {
      cap1Ref.current.visible = false;
    }

    if (cap2Ref.current && isEnhanced && mode === 'ballStick') {
      const capMat = cap2Ref.current.material as THREE.MeshPhongMaterial;
      const capScale = (currentRadius.current * 1.3) / 0.04;
      cap2Ref.current.scale.setScalar(capScale);
      capMat.opacity = currentOpacity.current;
      capMat.color.set(capColor2);
      cap2Ref.current.visible = true;
    } else if (cap2Ref.current) {
      cap2Ref.current.visible = false;
    }
  });

  const cap1Pos = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    return new THREE.Vector3().copy(start).add(dir.multiplyScalar(length / 2 + 0.01));
  }, [start, length, end]);

  const cap2Pos = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(start, end).normalize();
    return new THREE.Vector3().copy(end).add(dir.multiplyScalar(length / 2 + 0.01));
  }, [end, length, start]);

  return (
    <group>
      <mesh ref={meshRef} position={position} quaternion={quaternion}>
        <cylinderGeometry args={[0.04, 0.04, length, 12]} />
        <meshPhongMaterial color={targetColor} shininess={30} transparent opacity={1} />
      </mesh>

      <mesh ref={cap1Ref} position={cap1Pos}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshPhongMaterial color={capColor1} shininess={80} transparent />
      </mesh>

      <mesh ref={cap2Ref} position={cap2Pos}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshPhongMaterial color={capColor2} shininess={80} transparent />
      </mesh>
    </group>
  );
};

const StarParticles: React.FC<{ visible: boolean }> = ({ visible }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 300;

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      siz[i] = 0.02 + Math.random() * 0.04;
    }
    return [pos, siz];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !visible) return;
    const time = state.clock.elapsedTime;
    const geo = pointsRef.current.geometry;
    const attr = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const twinkle = 0.7 + 0.3 * Math.sin(time * 1.5 + i * 0.5);
      const sizeAttr = geo.attributes.size as THREE.BufferAttribute;
      sizeAttr.setX(i, sizes[i] * twinkle);
    }
    attr.needsUpdate = true;
    (geo.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    pointsRef.current.rotation.y += 0.0003;
  });

  if (!visible) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#8B9FFF"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

interface MoleculeGroupProps {
  moleculeName: string;
  mode: DisplayMode;
  quality: VisualQuality;
}

const MoleculeGroup: React.FC<MoleculeGroupProps> = ({ moleculeName, mode, quality }) => {
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
        <AtomMesh key={`${moleculeName}-atom-${i}`} atom={atom} index={i} mode={mode} quality={quality} />
      ))}
      {mol.bonds.map((bond, i) => (
        <BondMesh key={`${moleculeName}-bond-${i}`} bond={bond} atoms={mol.atoms} mode={mode} quality={quality} />
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
  const { currentMolecule, displayMode, visualQuality } = useMoleculeStore();
  const isEnhanced = visualQuality === 'enhanced';

  return (
    <>
      <GradientBackground />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -3, -5]} intensity={0.8} />
      {isEnhanced && <pointLight position={[0, 3, 3]} intensity={0.4} color="#6366F1" distance={10} />}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={5}
        enablePan
      />
      <StarParticles visible={isEnhanced} />
      <MoleculeGroup moleculeName={currentMolecule} mode={displayMode} quality={visualQuality} />
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
