import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface BrainModelProps {
  hoveredRegion: string | null;
  onRegionHover: (region: string | null) => void;
}

const REGION_POSITIONS: Record<string, [number, number, number]> = {
  frontal: [0, 0.5, 0.75],
  parietal: [0, 0.75, -0.05],
  temporal: [0.75, 0.1, 0.2],
  occipital: [0, 0.3, -0.95]
};

function noise3D(x: number, y: number, z: number, scale: number): number {
  const nx = x * scale;
  const ny = y * scale;
  const nz = z * scale;
  return (
    Math.sin(nx * 2.1) * Math.cos(ny * 1.7) * Math.sin(nz * 2.3) +
    Math.sin(nx * 4.5 + 1.0) * Math.cos(ny * 3.2 + 0.5) * Math.sin(nz * 3.8 + 1.2) * 0.5
  ) * 0.5;
}

function createHemisphereGeometry(isLeft: boolean): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1.0, 64, 48);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);

    const x = vertex.x;
    const y = vertex.y;
    const z = vertex.z;

    if ((isLeft && x > 0.02) || (!isLeft && x < -0.02)) {
      vertex.x = isLeft ? 0.02 : -0.02;
    }

    const frontBias = Math.max(0, z + 0.1) * 0.25;
    const backBias = Math.min(0, z + 0.4) * -0.12;
    const topBias = Math.max(0, y - 0.2) * 0.2;
    const bottomCompress = Math.min(0, y + 0.3) * 0.4;

    const temporalBulge = 
      Math.max(0, 1 - Math.abs(z - 0.1) * 1.5) * 
      Math.max(0, 0.5 - Math.abs(y - 0.1) * 1.8) * 
      0.35;

    let totalScale = 1 + frontBias + backBias + topBias + bottomCompress + temporalBulge * 0.3;

    const sulcusNoise = noise3D(x, y, z, 4.0) * 0.04;
    const gyrusNoise = noise3D(x, y * 1.5, z * 1.2, 6.0) * 0.02;
    totalScale += sulcusNoise + gyrusNoise;

    vertex.multiplyScalar(totalScale);

    vertex.z *= 1.2;
    vertex.y *= 1.15;

    if (Math.abs(z - 0.15) < 0.4 && y < 0.4 && y > -0.2) {
      const bulge = (1 - Math.abs(z - 0.15) / 0.4) * (1 - Math.abs(y - 0.1) / 0.3) * 0.3;
      vertex.x += (isLeft ? -1 : 1) * bulge * Math.abs(x);
    }

    if (isLeft) {
      vertex.x -= 0.02;
    } else {
      vertex.x += 0.02;
    }

    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createCerebellumGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(0.4, 32, 24);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);

    vertex.y *= 0.65;
    vertex.z *= 1.4;
    vertex.x *= 0.9;

    const folia = Math.sin(vertex.y * 15) * 0.03 + Math.sin(vertex.x * 12) * 0.02;
    vertex.multiplyScalar(1 + folia * 0.5);

    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createBrainstemGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.16, 0.22, 0.55, 20, 8);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);

    if (vertex.y < 0) {
      vertex.z -= Math.abs(vertex.y) * 0.3;
    }

    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createLongitudinalFissure(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(0.02, 1.8, 1, 10);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    vertex.z += Math.sin(vertex.y * 2.5) * 0.15;
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function mergeGeometries(
  geometries: THREE.BufferGeometry[],
  matrices: THREE.Matrix4[]
): THREE.BufferGeometry {
  const mergedGeo = new THREE.BufferGeometry();
  const allPositions: number[] = [];
  const allNormals: number[] = [];

  geometries.forEach((geo, idx) => {
    const matrix = matrices[idx] || new THREE.Matrix4();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);

    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;

    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      v.applyMatrix4(matrix);
      allPositions.push(v.x, v.y, v.z);

      n.fromBufferAttribute(normAttr, i);
      n.applyMatrix3(normalMatrix);
      allNormals.push(n.x, n.y, n.z);
    }

    const indexAttr = geo.index;
    if (indexAttr) {
      const indices = indexAttr.array;
      for (let i = 0; i < indices.length; i++) {
        const vi = indices[i];
        v.fromBufferAttribute(posAttr, vi);
        v.applyMatrix4(matrix);
        allPositions.push(v.x, v.y, v.z);

        n.fromBufferAttribute(normAttr, vi);
        n.applyMatrix3(normalMatrix);
        allNormals.push(n.x, n.y, n.z);
      }
    }
  });

  mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
  mergedGeo.computeVertexNormals();
  mergedGeo.computeBoundingSphere();
  mergedGeo.computeBoundingBox();

  return mergedGeo;
}

function createBrainGeometry(): THREE.BufferGeometry {
  const leftHemisphere = createHemisphereGeometry(true);
  const rightHemisphere = createHemisphereGeometry(false);
  const cerebellum = createCerebellumGeometry();
  const brainstem = createBrainstemGeometry();
  const fissure = createLongitudinalFissure();

  const leftMatrix = new THREE.Matrix4().makeTranslation(-0.28, 0, 0.05);
  const rightMatrix = new THREE.Matrix4().makeTranslation(0.28, 0, 0.05);
  const cerebellumMatrix = new THREE.Matrix4().makeTranslation(0, -0.25, -0.75);
  const brainstemMatrix = new THREE.Matrix4().makeTranslation(0, -0.65, -0.35);
  const fissureMatrix = new THREE.Matrix4().makeTranslation(0, 0.15, 0.05);

  const geometries = [leftHemisphere, rightHemisphere, cerebellum, brainstem, fissure];
  const matrices = [leftMatrix, rightMatrix, cerebellumMatrix, brainstemMatrix, fissureMatrix];

  return mergeGeometries(geometries, matrices);
}

function BrainModel({ hoveredRegion, onRegionHover }: BrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const regionMeshesRef = useRef<Record<string, THREE.Mesh>>({});

  const brainGeometry = useMemo(() => createBrainGeometry(), []);

  const regionGeometry = useMemo(() => {
    return new THREE.SphereGeometry(0.3, 32, 24);
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.06;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.02;
    }

    Object.entries(regionMeshesRef.current).forEach(([region, mesh]) => {
      if (mesh && mesh.material) {
        const material = mesh.material as THREE.MeshPhongMaterial;
        const targetOpacity = hoveredRegion === region ? 0.75 : 0.35;
        material.opacity += (targetOpacity - material.opacity) * 0.12;

        const targetEmissive = hoveredRegion === region ? 0.5 : 0.25;
        material.emissiveIntensity += (targetEmissive - material.emissiveIntensity) * 0.1;
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
          shininess={20}
          specular="#2a2a5a"
          flatShading={false}
        />
        <Edges color="#3a3a6a" threshold={30} scale={1.008} />
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
            opacity={0.35}
            emissive={getRegionColor(region)}
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

export default BrainModel;
