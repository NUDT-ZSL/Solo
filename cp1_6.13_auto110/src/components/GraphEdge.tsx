import React, { useMemo } from 'react';
import * as THREE from 'three';
import { EdgeData, NodeData, NODE_COLORS } from '@/types';

interface GraphEdgeProps {
  edge: EdgeData;
  sourceNode: NodeData;
  targetNode: NodeData;
  isHighlighted: boolean;
  isDimmed: boolean;
  isVisible: boolean;
}

const GraphEdge: React.FC<GraphEdgeProps> = ({
  sourceNode,
  targetNode,
  isHighlighted,
  isDimmed,
  isVisible
}) => {
  const { position, rotation, length } = useMemo(() => {
    const start = new THREE.Vector3(
      sourceNode.position.x,
      sourceNode.position.y,
      sourceNode.position.z
    );
    const end = new THREE.Vector3(
      targetNode.position.x,
      targetNode.position.y,
      targetNode.position.z
    );

    const length = start.distanceTo(end);
    const midpoint = start.clone().add(end).multiplyScalar(0.5);

    const direction = end.clone().sub(start).normalize();
    const rotation = new THREE.Euler();
    rotation.setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      )
    );

    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
      length
    };
  }, [sourceNode.position, targetNode.position]);

  const gradientColor = useMemo(() => {
    const sourceColor = new THREE.Color(NODE_COLORS[sourceNode.type]);
    const targetColor = new THREE.Color(NODE_COLORS[targetNode.type]);
    return sourceColor.clone().lerp(targetColor, 0.5);
  }, [sourceNode.type, targetNode.type]);

  const opacity = useMemo(() => {
    if (isHighlighted) return 1;
    if (isDimmed) return 0.15;
    return 0.8;
  }, [isHighlighted, isDimmed]);

  const emissiveIntensity = useMemo(() => {
    if (isHighlighted) return 0.5;
    return 0;
  }, [isHighlighted]);

  if (!isVisible) return null;

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.05, 0.05, length, 8]} />
      <meshStandardMaterial
        color={gradientColor}
        transparent
        opacity={opacity}
        emissive={gradientColor}
        emissiveIntensity={emissiveIntensity}
        depthWrite={false}
      />
    </mesh>
  );
};

export default React.memo(GraphEdge);
