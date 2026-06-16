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
  temporal: [0.7, 0.1, 0.15],
  occipital: [0, 0.2, -0.9]
};

function createBrainGeometry(): THREE.BufferGeometry {
  const brainGroup = new THREE.Group();

  const leftHemisphere = new THREE.SphereGeometry(1.0, 48, 48);
  deformHemisphere(leftHemisphere, -0.08);
  const leftMesh = new THREE.Mesh(leftHemisphere);
  leftMesh.position.x = -0.25;
  leftMesh.position.z = 0.05;
  brainGroup.add(leftMesh);

  const rightHemisphere = new THREE.SphereGeometry(1.0, 48, 48);
  deformHemisphere(rightHemisphere, 0.08);
  const rightMesh = new THREE.Mesh(rightHemisphere);
  rightMesh.position.x = 0.25;
  rightMesh.position.z = 0.05;
  brainGroup.add(rightMesh);

  const cerebellum = new THREE.SphereGeometry(0.45, 32, 32);
  const cerebellumPositions = cerebellum.attributes.position;
  for (let i = 0; i < cerebellumPositions.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(cerebellumPositions, i);
    v.y *= 0.7;
    v.z *= 1.3;
    cerebellumPositions.setXYZ(i, v.x, v.y, v.z);
  }
  cerebellum.computeVertexNormals();
  const cerebellumMesh = new THREE.Mesh(cerebellum);
  cerebellumMesh.position.set(0, -0.3, -0.75);
  brainGroup.add(cerebellumMesh);

  const brainStem = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 24);
  const brainStemMesh = new THREE.Mesh(brainStem);
  brainStemMesh.position.set(0, -0.65, -0.4);
  brainGroup.add(brainStemMesh);

  brainGroup.updateMatrixWorld(true);
  const mergedGeo = new THREE.BufferGeometry();

  const positions: number[] = [];
  const normals: number[] = [];

  brainGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geom = child.geometry;
      const posAttr = geom.attributes.position;
      const normAttr = geom.attributes.normal;
      const matrix = child.matrixWorld;

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);

      for (let i = 0; i < posAttr.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
        v.applyMatrix4(matrix);
        positions.push(v.x, v.y, v.z);

        const n = new THREE.Vector3().fromBufferAttribute(normAttr, i);
        n.applyMatrix3(normalMatrix);
        normals.push(n.x, n.y, n.z);
      }
    }
  });

  mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  mergedGeo.computeVertexNormals();
  mergedGeo.computeBoundingSphere();

  return mergedGeo;
}

function deformHemisphere(geometry: THREE.SphereGeometry, sideOffset: number) {
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);

    const noise = 
      Math.sin(vertex.x * 2.5) * Math.cos(vertex.y * 2) * Math.sin(vertex.z * 3) * 0.06;

    const frontBias = Math.max(0, vertex.z + 0.2) * 0.2;
    const backBias = Math.min(0, vertex.z + 0.3) * -0.1;
    const topBias = Math.max(0, vertex.y - 0.3) * 0.15;

    const scale = 1 + noise + frontBias + backBias + topBias;
    vertex.multiplyScalar(scale);

    vertex.z *= 1.15;
    vertex.y *= 1.1;
    vertex.x += sideOffset * 0.3;

    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
}

function BrainModel({ hoveredRegion, onRegionHover }: BrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const regionMeshesRef = useRef<Record<string, THREE.Mesh>>({});

  const brainGeometry = useMemo(() => createBrainGeometry(), []);

  const regionGeometry = useMemo(() => {
    return new THREE.SphereGeometry(0.28, 32, 32);
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
        opacity={0.65}
        side={THREE.DoubleSide}
        shininess={25}
        specular="#2a2a5a"
        flatShading={false}
      />
      <Edges color="#3a3a6a" threshold={25} scale={1.005} />
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
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

export default BrainModel;
