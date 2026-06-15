import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, STRATUM } from '../../store';
import { createLithologyMaterial } from './shaders';

interface LayerData {
  yTop: number;
  yBottom: number;
  thickness: number;
  color: THREE.Color;
  layerIndex: number;
}

function generateLayers(): LayerData[] {
  const layers: LayerData[] = [];
  let currentY = STRATUM.yTop;
  const startColor = new THREE.Color('#4e342e');
  const endColor = new THREE.Color('#bdbdbd');

  for (let i = 0; i < 10; i++) {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const rnd = Math.abs(seed - Math.floor(seed));
    const thickness = 5 + rnd * 10;
    const yBottom = currentY - thickness;
    const t = i / 9;
    const color = startColor.clone().lerp(endColor, t);
    layers.push({ yTop: currentY, yBottom, thickness, color, layerIndex: i });
    currentY = yBottom;
  }
  return layers;
}

interface CrossSectionMeshProps {
  layer: LayerData;
  cutAxis: 'x' | 'z';
  cutPosition: number;
  side: 'positive' | 'negative';
  clippingPlanes: THREE.Plane[];
}

function CrossSectionMesh({ layer, cutAxis, cutPosition, side, clippingPlanes }: CrossSectionMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, position } = useMemo(() => {
    const w = STRATUM.width / 2;
    const d = STRATUM.depth / 2;
    const thickness = 0.01;
    const height = layer.yTop - layer.yBottom;
    const centerY = (layer.yTop + layer.yBottom) / 2;

    let geom: THREE.BufferGeometry;
    let pos: [number, number, number];

    if (cutAxis === 'x') {
      geom = new THREE.BoxGeometry(thickness, height, STRATUM.depth);
      pos = [cutPosition, centerY, 0];
    } else {
      geom = new THREE.BoxGeometry(STRATUM.width, height, thickness);
      pos = [0, centerY, cutPosition];
    }

    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const basePositions = new Float32Array(posAttr.array);
    for (let i = 0; i < posAttr.count; i++) {
      const nx = basePositions[i * 3];
      const ny = basePositions[i * 3 + 1];
      const nz = basePositions[i * 3 + 2];
      let jitterX = 0, jitterY = 0, jitterZ = 0;
      if (cutAxis === 'x') {
        if (Math.abs(nx) > 0.0001) continue;
        const jitter = (Math.sin(i * 0.37 + layer.layerIndex * 2.1) * 0.5 + 0.5) * 0.8;
        jitterY = jitter * 0.3;
        jitterZ = (Math.cos(i * 0.23 + layer.layerIndex * 1.7) * 0.5 + 0.5) * 0.6 - 0.3;
      } else {
        if (Math.abs(nz) > 0.0001) continue;
        const jitter = (Math.sin(i * 0.41 + layer.layerIndex * 1.9) * 0.5 + 0.5) * 0.8;
        jitterY = jitter * 0.3;
        jitterX = (Math.cos(i * 0.29 + layer.layerIndex * 2.3) * 0.5 + 0.5) * 0.6 - 0.3;
      }
      posAttr.setXYZ(i, nx + jitterX, ny + jitterY, nz + jitterZ);
    }
    posAttr.needsUpdate = true;
    geom.computeVertexNormals();

    return { geometry: geom, position: pos };
  }, [layer, cutAxis, cutPosition]);

  const cutAxisVec = useMemo(
    () => new THREE.Vector3(cutAxis === 'x' ? 1 : 0, 0, cutAxis === 'z' ? 1 : 0),
    [cutAxis]
  );

  const material = useMemo(
    () => createLithologyMaterial(layer.color, layer.layerIndex, true, cutAxisVec),
    [layer, cutAxisVec]
  );

  useEffect(() => {
    if (matRef.current) {
      matRef.current.clippingPlanes = clippingPlanes;
      matRef.current.clipShadows = true;
    }
  }, [clippingPlanes]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry} material={material} material-ref={matRef} />
  );
}

interface LayerMeshProps {
  layer: LayerData;
  clippingPlanes: THREE.Plane[];
}

function LayerMesh({ layer, clippingPlanes }: LayerMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, position } = useMemo(() => {
    const height = layer.yTop - layer.yBottom;
    const centerY = (layer.yTop + layer.yBottom) / 2;
    const geom = new THREE.BoxGeometry(STRATUM.width, height, STRATUM.depth);

    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const ny = posAttr.getY(i);
      if (Math.abs(ny - height / 2) < 0.01 || Math.abs(ny + height / 2) < 0.01) {
        const nx = posAttr.getX(i);
        const nz = posAttr.getZ(i);
        const seed = nx * 7.13 + nz * 3.17 + layer.layerIndex * 11.7;
        const jitter = (Math.sin(seed) * 0.5 + 0.5) * 1.2 - 0.6;
        posAttr.setY(i, ny + jitter);
      }
    }
    posAttr.needsUpdate = true;
    geom.computeVertexNormals();

    return { geometry: geom, position: [0, centerY, 0] as [number, number, number] };
  }, [layer]);

  const material = useMemo(
    () => createLithologyMaterial(layer.color, layer.layerIndex, false),
    [layer]
  );

  useEffect(() => {
    if (matRef.current) {
      matRef.current.clippingPlanes = clippingPlanes;
      matRef.current.clipShadows = true;
    }
  }, [clippingPlanes]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={geometry}
      material={material}
      material-ref={matRef}
      castShadow
      receiveShadow
    />
  );
}

export default function StratumModel() {
  const { cutX, cutZ } = useStore();
  const layers = useMemo(() => generateLayers(), []);
  const groupRef = useRef<THREE.Group>(null);

  const clippingPlanes = useMemo(() => {
    const planes: THREE.Plane[] = [];
    if (cutX !== null) {
      planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), cutX));
    }
    if (cutZ !== null) {
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), cutZ));
    }
    return planes;
  }, [cutX, cutZ]);

  const halfW = STRATUM.width / 2;
  const halfD = STRATUM.depth / 2;

  return (
    <group ref={groupRef}>
      {layers.map((layer) => (
        <LayerMesh key={`layer-${layer.layerIndex}`} layer={layer} clippingPlanes={clippingPlanes} />
      ))}

      {cutX !== null &&
        layers.map((layer) => (
          <CrossSectionMesh
            key={`cs-x-pos-${layer.layerIndex}`}
            layer={layer}
            cutAxis="x"
            cutPosition={cutX - 0.005}
            side="positive"
            clippingPlanes={clippingPlanes}
          />
        ))}

      {cutZ !== null &&
        layers.map((layer) => (
          <CrossSectionMesh
            key={`cs-z-pos-${layer.layerIndex}`}
            layer={layer}
            cutAxis="z"
            cutPosition={cutZ - 0.005}
            side="positive"
            clippingPlanes={clippingPlanes}
          />
        ))}
    </group>
  );
}
