import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Artifact } from '../data/store';
import { useAppStore } from '../data/store';

export const artifactData: Artifact[] = [
  {
    id: 'pot-1',
    type: 'pot',
    name: '青釉陶罐',
    material: '红陶',
    era: '明代，约公元1500年',
    description: '这是一只保存完好的明代青釉陶罐，器形圆润饱满，釉色温润。从胎质和纹饰来看，应为民窑精品，是研究当时海上贸易的重要实物资料。',
    position: [-4, -1.2, 2],
    rotation: [0, 0.5, 0],
    scale: 1,
    tags: [],
  },
  {
    id: 'pot-2',
    type: 'pot',
    name: '酱釉大罐',
    material: '陶土',
    era: '宋代，约公元1200年',
    description: '宋代酱釉大罐，胎体厚重，釉色深沉。这类器物通常用于储存粮食或酒水，是海上丝绸之路常见的贸易品。',
    position: [3, -1.3, -1],
    rotation: [0, -0.3, 0.1],
    scale: 1.2,
    tags: [],
  },
  {
    id: 'coin-pile-1',
    type: 'coin',
    name: '铜钱堆',
    material: '铜合金',
    era: '清代，约公元1800年',
    description: '一堆散落的清代铜钱，虽经海水长期侵蚀，仍可辨识出钱文。这些钱币为判断沉船年代提供了重要依据。',
    position: [1, -1.45, 3],
    rotation: [0, 0, 0],
    scale: 1,
    tags: [],
  },
  {
    id: 'coin-pile-2',
    type: 'coin',
    name: '金币',
    material: '黄金',
    era: '不明，待鉴定',
    description: '几枚罕见的金币，成色极佳。它们可能是船上贵重货物的一部分，也可能是船商的私人财物，具有很高的历史和经济价值。',
    position: [-2, -1.45, -2],
    rotation: [0, 0.5, 0],
    scale: 1,
    tags: [],
  },
  {
    id: 'anchor-1',
    type: 'anchor',
    name: '铁锚',
    material: '熟铁',
    era: '18-19世纪',
    description: '一具保存相对完好的四爪铁锚。锚身粗壮，锻造痕迹明显。如此大型的铁锚说明这艘船具有相当的规模。',
    position: [5, -1.2, -3],
    rotation: [0, -0.8, 0.2],
    scale: 1,
    tags: [],
  },
  {
    id: 'pot-3',
    type: 'pot',
    name: '青花瓷瓶',
    material: '瓷器',
    era: '元代，约公元1350年',
    description: '元代青花残瓶，虽已破损，但青料发色浓艳，绘工精细。元青花存世稀少，这件残器仍具有极高的研究价值。',
    position: [-5, -1.3, -2],
    rotation: [0.2, 0.6, -0.1],
    scale: 0.9,
    tags: [],
  },
];

function getArtifactRadius(type: string): number {
  switch (type) {
    case 'pot': return 0.5;
    case 'coin': return 0.4;
    case 'anchor': return 0.8;
    default: return 0.5;
  }
}

export function SeabedTerrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(80, 80, 120, 120);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const colors: number[] = [];

    const sandColor = new THREE.Color('#c2b280');
    const shallowSandColor = new THREE.Color('#d4c59a');
    const midColor = new THREE.Color('#3d5a6e');
    const deepColor = new THREE.Color('#0a2a4a');

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const distFromCenter = Math.sqrt(x * x + z * z);
      const maxDist = 35;
      const t = Math.min(distFromCenter / maxDist, 1);

      const noise1 = Math.sin(x * 0.25) * Math.cos(z * 0.25) * 0.4;
      const noise2 = Math.sin(x * 0.08 + 0.5) * Math.cos(z * 0.12) * 0.8;
      const noise3 = Math.sin(x * 0.03) * Math.cos(z * 0.04) * 1.5;
      const noise4 = (Math.sin(x * 0.6 + z * 0.4) + Math.cos(x * 0.5 - z * 0.3)) * 0.15;
      const totalNoise = noise1 + noise2 + noise3 + noise4;

      const baseY = -0.5 - t * 3;
      const y = baseY + totalNoise;
      positions.setY(i, y);

      let finalColor: THREE.Color;
      if (t < 0.15) {
        finalColor = shallowSandColor.clone();
      } else if (t < 0.35) {
        const localT = (t - 0.15) / 0.2;
        finalColor = shallowSandColor.clone().lerp(sandColor, localT);
      } else if (t < 0.6) {
        const localT = (t - 0.35) / 0.25;
        finalColor = sandColor.clone().lerp(midColor, localT);
      } else {
        const localT = (t - 0.6) / 0.4;
        finalColor = midColor.clone().lerp(deepColor, Math.min(localT, 1));
      }

      if (y > -0.5 && t < 0.4) {
        finalColor.lerp(shallowSandColor, 0.4);
      }

      if (y < -2.5) {
        finalColor.lerp(deepColor, 0.5);
      }

      colors.push(finalColor.r, finalColor.g, finalColor.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={1}
        metalness={0.02}
        flatShading
      />
    </mesh>
  );
}

export function Shipwreck() {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={[0, -1.5, 0]} rotation={[0.1, 0.3, -0.15]}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[15, 1.2, 4]} />
        <meshStandardMaterial color="#4e342e" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[13, 0.8, 3.2]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[10, 0.5, 2.5]} />
        <meshStandardMaterial color="#6d4c41" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-4, 2.5, 0]} rotation={[0, 0, -0.1]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 3, 6]} />
        <meshStandardMaterial color="#4e342e" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-4, 4, 0.1]} castShadow>
        <coneGeometry args={[0.8, 1.5, 4]} />
        <meshStandardMaterial color="#795548" roughness={0.8} side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh position={[2, 2.3, 0]} rotation={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 2, 6]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[2, 3.3, 0.05]} castShadow>
        <coneGeometry args={[0.5, 1, 4]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.8} side={THREE.DoubleSide} flatShading />
      </mesh>
      {[-5, -2, 1, 4, 6].map((x, i) => (
        <mesh key={i} position={[x, 0.8, 2.1]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.06, 6, 8]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} flatShading />
        </mesh>
      ))}
      {[-5, -2, 1, 4, 6].map((x, i) => (
        <mesh key={`b2-${i}`} position={[x, 0.8, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.06, 6, 8]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[15.2, 0.1, 4.2]} />
        <meshStandardMaterial
          color="#388e3c"
          transparent
          opacity={0.6}
          roughness={1}
        />
      </mesh>
      <mesh position={[-4, 2.5, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 3.1, 6]} />
        <meshStandardMaterial
          color="#2e7d32"
          transparent
          opacity={0.5}
          roughness={1}
        />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 5 + Math.random() * 2;
        return (
          <mesh
            key={`seaweed-${i}`}
            position={[
              Math.cos(angle) * radius,
              0.3,
              Math.sin(angle) * radius,
            ]}
          >
            <cylinderGeometry args={[0.05, 0.02, 0.8, 4]} />
            <meshStandardMaterial
              color="#66bb6a"
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function PotArtifact({ artifact }: { artifact: Artifact }) {
  const meshRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [isNear, setIsNear] = useState(false);
  const isSelected = useAppStore((s) => s.selectedArtifact?.id === artifact.id);
  const addDiscovered = useAppStore((s) => s.addDiscoveredArtifact);
  const setSelected = useAppStore((s) => s.setSelectedArtifact);
  const setShowInfoCard = useAppStore((s) => s.setShowInfoCard);

  const radius = getArtifactRadius('pot') * artifact.scale;

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const dist = camera.position.distanceTo(
      new THREE.Vector3(...artifact.position)
    );
    const nearThreshold = 5;
    const near = dist < nearThreshold;
    if (near !== isNear) {
      setIsNear(near);
      if (near) {
        addDiscovered(artifact.id);
      }
    }

    if (isSelected) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = artifact.position[1] + Math.sin(time * (Math.PI * 2 / 1.5)) * 0.1;

      const targetDir = new THREE.Vector3();
      camera.getWorldDirection(targetDir);
      targetDir.y = 0;
      targetDir.normalize();
      const targetAngle = Math.atan2(targetDir.x, targetDir.z);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetAngle,
        delta * 3
      );
    }

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = (isNear || isSelected) ? 0.4 : 0;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, delta * 5);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelected(artifact);
    setShowInfoCard(true);
    addDiscovered(artifact.id);
  };

  return (
    <group
      ref={meshRef}
      position={artifact.position}
      rotation={artifact.rotation}
      onClick={handleClick}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.3 * artifact.scale, 12, 8]} />
        <meshStandardMaterial color="#a0522d" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.25 * artifact.scale, 0]} castShadow>
        <cylinderGeometry args={[0.15 * artifact.scale, 0.25 * artifact.scale, 0.15 * artifact.scale, 10]} />
        <meshStandardMaterial color="#8b4513" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, -0.25 * artifact.scale, 0]} castShadow>
        <cylinderGeometry args={[0.22 * artifact.scale, 0.28 * artifact.scale, 0.1 * artifact.scale, 10]} />
        <meshStandardMaterial color="#a0522d" roughness={1} flatShading />
      </mesh>
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[radius * 1.3, 16, 12]} />
        <meshBasicMaterial
          color="#81d4fa"
          transparent
          opacity={0}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export function CoinArtifact({ artifact }: { artifact: Artifact }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [isNear, setIsNear] = useState(false);
  const isSelected = useAppStore((s) => s.selectedArtifact?.id === artifact.id);
  const addDiscovered = useAppStore((s) => s.addDiscoveredArtifact);
  const setSelected = useAppStore((s) => s.setSelectedArtifact);
  const setShowInfoCard = useAppStore((s) => s.setShowInfoCard);

  const radius = getArtifactRadius('coin') * artifact.scale;

  const coins = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      pos: [
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.05,
        (Math.random() - 0.5) * 0.5,
      ] as [number, number, number],
      rot: [Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3] as [number, number, number],
    }));
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const dist = camera.position.distanceTo(
      new THREE.Vector3(...artifact.position)
    );
    const nearThreshold = 4;
    const near = dist < nearThreshold;
    if (near !== isNear) {
      setIsNear(near);
      if (near) {
        addDiscovered(artifact.id);
      }
    }

    if (isSelected) {
      const time = state.clock.elapsedTime;
      groupRef.current.position.y = artifact.position[1] + Math.sin(time * (Math.PI * 2 / 1.5)) * 0.1;

      const targetDir = new THREE.Vector3();
      camera.getWorldDirection(targetDir);
      targetDir.y = 0;
      targetDir.normalize();
      const targetAngle = Math.atan2(targetDir.x, targetDir.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetAngle,
        delta * 3
      );
    }

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = (isNear || isSelected) ? 0.4 : 0;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, delta * 5);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelected(artifact);
    setShowInfoCard(true);
    addDiscovered(artifact.id);
  };

  return (
    <group
      ref={groupRef}
      position={artifact.position}
      rotation={artifact.rotation}
      onClick={handleClick}
    >
      {coins.map((coin, i) => (
        <mesh key={i} position={coin.pos} rotation={coin.rot} castShadow>
          <cylinderGeometry args={[0.05 * artifact.scale, 0.05 * artifact.scale, 0.02 * artifact.scale, 12]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.95}
            roughness={0.1}
          />
        </mesh>
      ))}
      <mesh ref={glowRef} position={[0, 0.1, 0]}>
        <sphereGeometry args={[radius * 1.5, 16, 12]} />
        <meshBasicMaterial
          color="#81d4fa"
          transparent
          opacity={0}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export function AnchorArtifact({ artifact }: { artifact: Artifact }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [isNear, setIsNear] = useState(false);
  const isSelected = useAppStore((s) => s.selectedArtifact?.id === artifact.id);
  const addDiscovered = useAppStore((s) => s.addDiscoveredArtifact);
  const setSelected = useAppStore((s) => s.setSelectedArtifact);
  const setShowInfoCard = useAppStore((s) => s.setShowInfoCard);

  const radius = getArtifactRadius('anchor') * artifact.scale;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const dist = camera.position.distanceTo(
      new THREE.Vector3(...artifact.position)
    );
    const nearThreshold = 6;
    const near = dist < nearThreshold;
    if (near !== isNear) {
      setIsNear(near);
      if (near) {
        addDiscovered(artifact.id);
      }
    }

    if (isSelected) {
      const time = state.clock.elapsedTime;
      groupRef.current.position.y = artifact.position[1] + Math.sin(time * (Math.PI * 2 / 1.5)) * 0.1;

      const targetDir = new THREE.Vector3();
      camera.getWorldDirection(targetDir);
      targetDir.y = 0;
      targetDir.normalize();
      const targetAngle = Math.atan2(targetDir.x, targetDir.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetAngle + artifact.rotation[1],
        delta * 3
      );
    }

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = (isNear || isSelected) ? 0.4 : 0;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, delta * 5);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelected(artifact);
    setShowInfoCard(true);
    addDiscovered(artifact.id);
  };

  return (
    <group
      ref={groupRef}
      position={artifact.position}
      rotation={artifact.rotation}
      onClick={handleClick}
    >
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#616161" roughness={0.7} metalness={0.4} flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#616161" roughness={0.7} metalness={0.4} flatShading />
      </mesh>
      <mesh position={[-0.4, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        <meshStandardMaterial color="#616161" roughness={0.7} metalness={0.4} flatShading />
      </mesh>
      <mesh position={[0.4, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        <meshStandardMaterial color="#616161" roughness={0.7} metalness={0.4} flatShading />
      </mesh>
      <mesh position={[-0.4, -0.15, 0]} castShadow>
        <coneGeometry args={[0.12, 0.2, 6]} />
        <meshStandardMaterial color="#424242" roughness={0.6} metalness={0.5} flatShading />
      </mesh>
      <mesh position={[0.4, -0.15, 0]} castShadow>
        <coneGeometry args={[0.12, 0.2, 6]} />
        <meshStandardMaterial color="#424242" roughness={0.6} metalness={0.5} flatShading />
      </mesh>
      <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.12, 0.05, 6, 8]} />
        <meshStandardMaterial color="#616161" roughness={0.7} metalness={0.4} flatShading />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.3, 0]}>
        <sphereGeometry args={[radius * 1.2, 16, 12]} />
        <meshBasicMaterial
          color="#81d4fa"
          transparent
          opacity={0}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export function Artifacts() {
  return (
    <>
      {artifactData.map((artifact) => {
        switch (artifact.type) {
          case 'pot':
            return <PotArtifact key={artifact.id} artifact={artifact} />;
          case 'coin':
            return <CoinArtifact key={artifact.id} artifact={artifact} />;
          case 'anchor':
            return <AnchorArtifact key={artifact.id} artifact={artifact} />;
          default:
            return null;
        }
      })}
    </>
  );
}

interface FishData {
  offset: [number, number, number];
  speed: number;
  phase: number;
  scatterDir: [number, number, number];
}

export function FishSchool() {
  const groupRef = useRef<THREE.Group>(null);
  const fishRefs = useRef<THREE.Group[]>([]);
  const fishScattered = useAppStore((s) => s.fishScattered);
  const setFishScattered = useAppStore((s) => s.setFishScattered);
  const scatterTimerRef = useRef<number | null>(null);

  const fishData: FishData[] = useMemo(() => {
    return Array.from({ length: 12 }, () => ({
      offset: [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 2,
      ] as [number, number, number],
      speed: 0.8 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      scatterDir: [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2,
      ] as [number, number, number],
    }));
  }, []);

  const basePositions = useRef<[number, number, number][]>(
    fishData.map((f) => [f.offset[0], f.offset[1], f.offset[2]])
  );

  const scatterProgressRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const speed = 0.2;

    const baseX = Math.sin(time * speed) * 8;
    const baseZ = time * speed * 5 - 10;
    const baseY = Math.sin(time * speed * 0.7) * 0.5 + 0.5;

    groupRef.current.position.set(baseX, baseY, baseZ);

    if (fishScattered) {
      scatterProgressRef.current = Math.min(1, scatterProgressRef.current + delta / 0.5);
    } else {
      scatterProgressRef.current = Math.max(0, scatterProgressRef.current - delta / 0.5);
    }

    fishRefs.current.forEach((fish, i) => {
      if (!fish) return;
      const data = fishData[i];
      const base = basePositions.current[i];

      const scatterAmount = scatterProgressRef.current;
      const scatterDist = 2 * scatterAmount;

      const fishX = base[0] + data.scatterDir[0] * scatterDist + Math.sin(time * data.speed + data.phase) * 0.2;
      const fishY = base[1] + data.scatterDir[1] * scatterDist * 0.3 + Math.cos(time * data.speed * 1.3 + data.phase) * 0.1;
      const fishZ = base[2] + data.scatterDir[2] * scatterDist;

      fish.position.set(fishX, fishY, fishZ);
      fish.rotation.y = Math.sin(time * data.speed + data.phase) * 0.3;
    });
  });

  const handlePointerOver = () => {
    setFishScattered(true);
    if (scatterTimerRef.current) {
      clearTimeout(scatterTimerRef.current);
    }
    scatterTimerRef.current = window.setTimeout(() => {
      setFishScattered(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (scatterTimerRef.current) {
        clearTimeout(scatterTimerRef.current);
      }
    };
  }, []);

  return (
    <group ref={groupRef} onPointerOver={handlePointerOver}>
      {fishData.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) fishRefs.current[i] = el;
          }}
        >
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color="#b0bec5" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0.035, 0, 0]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshStandardMaterial color="#90a4ae" roughness={0.3} metalness={0.3} />
          </mesh>
          <mesh position={[-0.045, 0, 0]}>
            <sphereGeometry args={[0.02, 6, 4]} />
            <meshStandardMaterial color="#b0bec5" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0.045, -0.005, 0.02]}>
            <sphereGeometry args={[0.006, 6, 4]} />
            <meshStandardMaterial color="#1a237e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Annotations() {
  const annotations = useAppStore((s) => s.annotations);

  return (
    <>
      {annotations.map((ann) => (
        <group key={ann.id} position={ann.position}>
          <mesh position={[0, 0.075, 0]}>
            <coneGeometry args={[0.1, 0.15, 4]} />
            <meshStandardMaterial color={ann.color} emissive={ann.color} emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function Markers() {
  return null;
}
