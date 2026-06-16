import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface BrainModelProps {
  hoveredRegion: string | null;
  onRegionHover: (region: string | null) => void;
}

const REGION_POSITIONS: Record<string, [number, number, number]> = {
  frontal: [0, 0.4, 0.7],
  parietal: [0, 0.7, -0.1],
  temporal: [0.7, 0.1, 0.1],
  occipital: [0, 0.2, -0.9]
};

function BrainModel({ hoveredRegion, onRegionHover }: BrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const regionMeshesRef = useRef<Record<string, THREE.Mesh>>({});

  const brainGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.2, 64, 64);
    const positions = geo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      const noise = Math.sin(vertex.x * 3) * Math.cos(vertex.y * 2) * Math.sin(vertex.z * 2.5) * 0.08;
      const frontBias = Math.max(0, vertex.z) * 0.15;
      const backBias = Math.min(0, vertex.z) * -0.05;
      const topBias = Math.max(0, vertex.y) * 0.1;

      const scale = 1 + noise + frontBias + backBias + topBias;
      vertex.multiplyScalar(scale);

      vertex.z *= 1.1;
      vertex.y *= 1.15;

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  const regionGeometry = useMemo(() => {
    return new THREE.SphereGeometry(0.25, 32, 32);
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }

    Object.entries(regionMeshesRef.current).forEach(([region, mesh]) => {
      if (mesh && mesh.material) {
        const material = mesh.material as THREE.MeshPhongMaterial;
        const targetOpacity = hoveredRegion === region ? 0.7 : 0.3;
        material.opacity += (targetOpacity - material.opacity) * 0.1;
      }
    });
  });

  const handlePointerOver = (region: string) => (e: any) => {
    e.stopPropagation();
    onRegionHover(region);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    onRegionHover(null);
    document.body.style.cursor = 'default';
  };

  const getRegionColor = (region: string): string => {
    switch (region) {
      case 'frontal': return '#00d2ff';
      case 'parietal': return '#00ff88';
      case 'temporal': return '#ffd700';
      case 'occipital': return '#ff4757';
      default: return '#ffffff';
    }
  };

  return (
    <group ref={groupRef}>
      <mesh geometry={brainGeometry}>
        <meshPhongMaterial
          color="#1a1a3a"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          shininess={30}
          specular="#2a2a5a"
        />
        <Edges color="#3a3a6a" threshold={15} scale={1.01} />
      </mesh>

      {Object.entries(REGION_POSITIONS).map(([region, pos]) => (
        <mesh
          key={region}
          ref={(el) => {
            if (el) regionMeshesRef.current[region] = el;
          }}
          position={pos as [number, number, number]}
          geometry={regionGeometry}
          onPointerOver={handlePointerOver(region)}
          onPointerOut={handlePointerOut}
        >
          <meshPhongMaterial
            color={getRegionColor(region)}
            transparent
            opacity={0.3}
            emissive={getRegionColor(region)}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default BrainModel;
