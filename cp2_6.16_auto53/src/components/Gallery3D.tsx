import { useRef, useMemo, memo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Work } from '../data/works';

interface Gallery3DProps {
  works: Work[];
  focusedId: number | null;
  onCardClick: (id: number) => void;
  onSceneClick: () => void;
  isMobile: boolean;
}

interface WorkCardProps {
  work: Work;
  index: number;
  isFocused: boolean;
  isOtherFocused: boolean;
  cardSize: { w: number; h: number };
  spacing: number;
  onClick: (id: number) => void;
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const hexToRgb = (hex: string): THREE.Color => {
  return new THREE.Color(hex);
};

const WorkCard = memo(function WorkCard({
  work,
  index,
  isFocused,
  isOtherFocused,
  cardSize,
  spacing,
  onClick
}: WorkCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const backRef = useRef<THREE.Mesh>(null);
  const hoverRef = useRef({ hovered: false });
  const progressRef = useRef(0);
  const baseYRef = useRef(0);

  const row = Math.floor(index / 3);
  const col = index % 3;
  const offsetX = (col - 1) * spacing;
  const offsetZ = (row - 0.5) * -spacing;

  const colors = useMemo(
    () => work.colors.map(c => hexToRgb(c)),
    [work.colors]
  );

  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, work.colors[0]);
    gradient.addColorStop(0.5, work.colors[1]);
    gradient.addColorStop(1, work.colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [work.colors]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const elapsed = clock.getElapsedTime();
      const targetProgress = isFocused ? 1 : 0;
      const diff = targetProgress - progressRef.current;
      progressRef.current += diff * 0.08;
      const easedProgress = easeInOutCubic(Math.min(1, Math.max(0, progressRef.current)));

      baseYRef.current = Math.sin(elapsed * Math.PI * 0.5 + index * 0.8) * 0.15;

      const targetZ = easedProgress * 1.5;
      const targetScale = 1 + easedProgress * 0.3;
      const targetOpacity = isOtherFocused && !isFocused ? 0.3 : 1;

      groupRef.current.position.set(
        offsetX,
        baseYRef.current,
        offsetZ + targetZ
      );
      groupRef.current.scale.setScalar(targetScale);

      const frontMat = (groupRef.current.children[0] as THREE.Mesh)?.material as THREE.MeshStandardMaterial;
      const backMat = (groupRef.current.children[1] as THREE.Mesh)?.material as THREE.MeshStandardMaterial;
      if (frontMat) {
        frontMat.opacity = targetOpacity;
        frontMat.transparent = targetOpacity < 1;
      }
      if (backMat) {
        backMat.opacity = targetOpacity;
        backMat.transparent = targetOpacity < 1;
      }

      if (backRef.current) {
        const mat = backRef.current.material as THREE.MeshStandardMaterial;
        const baseIntensity = 0.8;
        const hoverIntensity = hoverRef.current.hovered ? 1.2 : baseIntensity;
        const pulse = hoverRef.current.hovered
          ? baseIntensity + Math.sin(elapsed * Math.PI * 2) * 0.15
          : hoverIntensity;
        mat.emissiveIntensity = pulse;
      }
    }
  });

  const handlePointerOver = () => {
    hoverRef.current.hovered = true;
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    hoverRef.current.hovered = false;
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(work.id);
  };

  const { w, h } = cardSize;

  return (
    <group
      ref={groupRef}
      position={[offsetX, 0, offsetZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh position={[0, 0, 0.051]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={gradientTexture}
          transparent
          opacity={1}
        />
      </mesh>

      <mesh ref={backRef} position={[0, 0, -0.051]}>
        <boxGeometry args={[w, h, 0.002]} />
        <meshStandardMaterial
          color={0x111111}
          emissive={colors[0]}
          emissiveIntensity={0.8}
          transparent
          opacity={1}
        />
      </mesh>

      <mesh position={[0, 0, 0.052]}>
        <Text
          position={[0, h * 0.35, 0]}
          fontSize={0.18}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={w * 0.85}
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {work.title}
        </Text>
      </mesh>

      <RoundedBox
        args={[w, h, 0.1]}
        radius={0.08}
        smoothness={4}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={0xffffff}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </RoundedBox>
    </group>
  );
});

const InfoPanel = memo(function InfoPanel({
  work,
  position
}: {
  work: Work;
  position: [number, number, number];
}) {
  const panelRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  useFrame(() => {
    if (panelRef.current) {
      const target = 1;
      const diff = target - progressRef.current;
      progressRef.current += diff * 0.1;
      const eased = easeInOutCubic(progressRef.current);
      panelRef.current.scale.setScalar(eased);
      panelRef.current.position.y = position[1] + 1.6 + (1 - eased) * 0.5;
      (panelRef.current.children[0] as THREE.Mesh).material.opacity = eased * 0.9;
    }
  });

  return (
    <group ref={panelRef} position={position}>
      <RoundedBox args={[3, 1.2, 0.05]} radius={0.2} smoothness={4}>
        <meshStandardMaterial
          color={0x000000}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </RoundedBox>

      <Text
        position={[-1.3, 0.35, 0.03]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        fontWeight="bold"
      >
        {work.title}
      </Text>

      <group position={[-1.3, 0.05, 0.03]}>
        {work.colors.map((color, i) => (
          <group key={i} position={[i * 0.55, 0, 0]}>
            <mesh>
              <circleGeometry args={[0.12, 32]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <Text
              position={[0.18, 0, 0]}
              fontSize={0.08}
              color="#aaaaaa"
              anchorX="left"
              anchorY="middle"
            >
              {color}
            </Text>
          </group>
        ))}
      </group>

      <group position={[-1.3, -0.35, 0.03]}>
        {work.tags.map((tag, i) => (
          <group key={tag} position={[i * 1.1, 0, 0]}>
            <RoundedBox args={[1, 0.25, 0.01]} radius={0.04} smoothness={2}>
              <meshStandardMaterial
                color={work.colors[0]}
                transparent
                opacity={0.3}
              />
            </RoundedBox>
            <Text
              fontSize={0.1}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              {tag}
            </Text>
          </group>
        ))}
      </group>
    </group>
  );
});

const Particles = memo(function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 200;

  const { positions, opacities, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const op = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      op[i] = 0.1 + Math.random() * 0.3;
      vel[i * 3] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    return { positions: pos, opacities: op, velocities: vel };
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3] += velocities[i * 3];
        posArray[i * 3 + 1] += velocities[i * 3 + 1];
        posArray[i * 3 + 2] += velocities[i * 3 + 2];
        if (Math.abs(posArray[i * 3]) > 10) velocities[i * 3] *= -1;
        if (Math.abs(posArray[i * 3 + 1]) > 5) velocities[i * 3 + 1] *= -1;
        if (Math.abs(posArray[i * 3 + 2]) > 10) velocities[i * 3 + 2] *= -1;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={0xffffff}
        transparent
        opacity={0.25}
        sizeAttenuation
      />
    </points>
  );
});

const Scene = memo(function Scene({
  works,
  focusedId,
  onCardClick,
  onSceneClick,
  isMobile
}: Omit<Gallery3DProps, 'isMobile'> & { isMobile: boolean }) {
  const spacing = isMobile ? 1.8 : 2.5;
  const cardSize = isMobile ? { w: 1.2, h: 0.8 } : { w: 1.5, h: 2 };
  const cameraZ = isMobile ? 5 : 6;

  const focusedWork = useMemo(
    () => works.find(w => w.id === focusedId) || null,
    [works, focusedId]
  );

  const focusedPosition = useMemo<[number, number, number] | null>(() => {
    if (!focusedWork) return null;
    const index = works.findIndex(w => w.id === focusedId);
    if (index === -1) return null;
    const row = Math.floor(index / 3);
    const col = index % 3;
    return [
      (col - 1) * spacing,
      0,
      (row - 0.5) * -spacing + 1.5
    ];
  }, [focusedId, works, spacing]);

  const handleScenePointerMissed = () => {
    if (focusedId !== null) {
      onSceneClick();
    }
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#a855f7" />
      <pointLight position={[5, 3, 5]} intensity={0.3} color="#4ecdc4" />

      <gridHelper
        args={[30, 60, 0x333333, 0x333333]}
        position={[0, -1.2, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial
          color={0x0a0a1a}
          transparent
          opacity={0.5}
        />
      </mesh>

      <Particles />

      <group onPointerMissed={handleScenePointerMissed}>
        {works.map((work, index) => (
          <WorkCard
            key={work.id}
            work={work}
            index={index}
            isFocused={focusedId === work.id}
            isOtherFocused={focusedId !== null && focusedId !== work.id}
            cardSize={cardSize}
            spacing={spacing}
            onClick={onCardClick}
          />
        ))}
      </group>

      {focusedWork && focusedPosition && (
        <InfoPanel work={focusedWork} position={focusedPosition} />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={8}
        enablePan={false}
        target={[0, 0, 0]}
      />
    </>
  );
});

function Gallery3D(props: Gallery3DProps) {
  const cameraPosition: [number, number, number] = props.isMobile ? [0, 2.5, 5] : [0, 3, 6];

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 50 }}
      gl={{
        antialias: true,
        alpha: true
      }}
      shadows
      dpr={[1, 2]}
      style={{
        background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3e 100%)'
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

export default memo(Gallery3D);
