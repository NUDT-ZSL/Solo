import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { NodeData, NODE_COLORS } from '@/types';

interface GraphNodeProps {
  node: NodeData;
  isSelected: boolean;
  isHovered: boolean;
  isVisible: boolean;
  onPointerOver: (node: NodeData) => void;
  onPointerOut: () => void;
  onClick: (node: NodeData) => void;
}

const GraphNode: React.FC<GraphNodeProps> = ({
  node,
  isSelected,
  isHovered,
  isVisible,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const color = NODE_COLORS[node.type];
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  const scale = useMemo(() => {
    if (isSelected) return 1.5;
    if (isHovered) return 1.3;
    return 1;
  }, [isSelected, isHovered]);

  const haloScale = useMemo(() => scale * 1.5, [scale]);
  const showHalo = isSelected || isHovered;

  useFrame(({ clock }) => {
    if (haloRef.current && showHalo) {
      const elapsed = clock.getElapsedTime();
      const pulse = 1 + Math.sin(elapsed * Math.PI * 2) * 0.1;
      haloRef.current.scale.setScalar(haloScale * pulse);
      const material = haloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(elapsed * Math.PI * 2) * 0.1;
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    onPointerOver(node);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    onPointerOut();
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(node);
  };

  if (!isVisible) return null;

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <mesh
        ref={meshRef}
        scale={scale}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[node.radius, 32, 32]} />
        <meshStandardMaterial
          color={threeColor}
          metalness={0.3}
          roughness={0.4}
          emissive={threeColor}
          emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.25 : 0.1}
        />
      </mesh>

      {showHalo && (
        <mesh ref={haloRef} scale={haloScale}>
          <sphereGeometry args={[node.radius, 32, 32]} />
          <meshBasicMaterial
            color={threeColor}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

export default React.memo(GraphNode);
