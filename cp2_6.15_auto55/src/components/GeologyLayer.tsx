import { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '@/store';
import type { GeologyLayer as GeologyLayerType } from '@/types';

interface GeologyLayerProps {
  onLayerClick?: (layer: GeologyLayerType) => void;
}

function generateDisplacementMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  const imageData = ctx.createImageData(256, 256);
  const data = imageData.data;
  
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.5 + 
                    Math.sin(x * 0.02 + y * 0.03) * 0.3 +
                    Math.cos(x * 0.08 - y * 0.04) * 0.2;
      const value = Math.floor((noise * 0.5 + 0.5) * 255 * 0.3 + 255 * 0.35);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

interface LayerMeshProps {
  layer: GeologyLayerType;
  displacementMap: THREE.CanvasTexture;
  onLayerClick?: (layer: GeologyLayerType) => void;
}

function LayerMesh({ layer, displacementMap, onLayerClick }: LayerMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectedPoint = useStore((state) => state.selectedPoint);
  const queryPoint = useStore((state) => state.queryPoint);

  const isSelected = selectedPoint !== null && selectedPoint.layerId === layer.id;

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = isSelected ? 0.6 : hovered ? 0.45 : 0.3;
      material.emissive = new THREE.Color(isSelected ? '#ffffff' : hovered ? '#aaaaaa' : '#000000');
      material.emissiveIntensity = isSelected ? 0.3 : hovered ? 0.1 : 0;
      
      const time = state.clock.elapsedTime;
      displacementMap.offset.y = time * 0.05;
      displacementMap.needsUpdate = true;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const x = 0;
    const y = -layer.depth - layer.height / 2;
    const z = 0;
    queryPoint(x, y, z);
    onLayerClick?.(layer);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <mesh
      ref={meshRef}
      position={[0, -layer.depth - layer.height / 2, 0]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[40, layer.height, 30]} />
      <meshStandardMaterial
        color={layer.color}
        transparent
        opacity={0.3}
        displacementMap={displacementMap}
        displacementScale={0.3}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
      {hovered && (
        <Html
          position={[0, layer.height / 2 + 1, 0]}
          center
          distanceFactor={10}
        >
          <div className="bg-gray-900 bg-opacity-95 text-white px-4 py-3 rounded-lg shadow-lg border border-gray-700 whitespace-nowrap min-w-[160px]">
            <div className="font-bold text-base mb-1">{layer.name}</div>
            <div className="text-sm text-gray-300">
              <div>岩性: {layer.lithology}</div>
              <div>深度: {layer.depth}m</div>
              <div>厚度: {layer.height}m</div>
            </div>
          </div>
        </Html>
      )}
    </mesh>
  );
}

export default function GeologyLayer({ onLayerClick }: GeologyLayerProps) {
  const layers = useStore((state) => state.layers);

  const displacementMap = useMemo(() => generateDisplacementMap(), []);

  return (
    <group>
      {layers.map((layer) => (
        <LayerMesh
          key={layer.id}
          layer={layer}
          displacementMap={displacementMap}
          onLayerClick={onLayerClick}
        />
      ))}
    </group>
  );
}
