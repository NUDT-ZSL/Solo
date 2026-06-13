import React, { useRef, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { NodeData, EdgeData, NodeType } from '@/types';
import GraphNode from './GraphNode';
import GraphEdge from './GraphEdge';
import { easeInOutCubic } from '@/utils/easing';

export interface SceneHandle {
  focusOnNode: (nodeId: string) => void;
  resetLayout: () => void;
}

interface SceneContentProps {
  nodes: NodeData[];
  edges: EdgeData[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hiddenTypes: NodeType[];
  searchFilter: string;
  onNodeClick: (node: NodeData | null) => void;
  onNodeHover: (node: NodeData | null) => void;
  focusTarget: { nodeId: string } | null;
  onFocusComplete: () => void;
}

const SceneContent: React.FC<SceneContentProps> = ({
  nodes,
  edges,
  selectedNodeId,
  hoveredNodeId,
  hiddenTypes,
  searchFilter,
  onNodeClick,
  onNodeHover,
  focusTarget,
  onFocusComplete
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const cameraAnimationRef = useRef<{
    startPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endPos: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);

  const connectedEdgeIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedNodeId) {
      edges.forEach(edge => {
        if (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId) {
          set.add(edge.id);
        }
      });
    }
    return set;
  }, [edges, selectedNodeId]);

  const isNodeVisible = useCallback(
    (node: NodeData) => {
      if (hiddenTypes.includes(node.type)) return false;
      if (searchFilter && !node.name.toLowerCase().includes(searchFilter.toLowerCase())) {
        return false;
      }
      return true;
    },
    [hiddenTypes, searchFilter]
  );

  const isEdgeVisible = useCallback(
    (edge: EdgeData) => {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) return false;
      if (hiddenTypes.includes(source.type) || hiddenTypes.includes(target.type)) return false;
      return true;
    },
    [nodeMap, hiddenTypes]
  );

  const handleNodePointerOver = useCallback(
    (node: NodeData) => {
      onNodeHover(node);
    },
    [onNodeHover]
  );

  const handleNodePointerOut = useCallback(() => {
    onNodeHover(null);
  }, [onNodeHover]);

  const handleNodeClick = useCallback(
    (node: NodeData) => {
      onNodeClick(node);
    },
    [onNodeClick]
  );

  const handleCanvasClick = useCallback(() => {
    onNodeClick(null);
  }, [onNodeClick]);

  useEffect(() => {
    if (focusTarget && controlsRef.current) {
      const node = nodeMap.get(focusTarget.nodeId);
      if (!node) return;

      const targetPos = new THREE.Vector3(
        node.position.x,
        node.position.y,
        node.position.z
      );

      const direction = new THREE.Vector3()
        .subVectors(camera.position, controlsRef.current.target)
        .normalize();

      const endPos = targetPos.clone().add(direction.multiplyScalar(3));

      cameraAnimationRef.current = {
        startPos: camera.position.clone(),
        startTarget: controlsRef.current.target.clone(),
        endPos: endPos,
        endTarget: targetPos,
        startTime: performance.now(),
        duration: 1500
      };

      controlsRef.current.enabled = false;
    }
  }, [focusTarget, camera, nodeMap]);

  useFrame(() => {
    if (cameraAnimationRef.current && controlsRef.current) {
      const { startPos, startTarget, endPos, endTarget, startTime, duration } =
        cameraAnimationRef.current;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      camera.position.lerpVectors(startPos, endPos, eased);
      controlsRef.current.target.lerpVectors(startTarget, endTarget, eased);
      controlsRef.current.update();

      if (progress >= 1) {
        cameraAnimationRef.current = null;
        controlsRef.current.enabled = true;
        onFocusComplete();
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -10]} color="#6366f1" intensity={0.5} distance={50} />

      <Grid
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#1e293b"
        fadeDistance={40}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      <group onClick={handleCanvasClick}>
        {edges.map(edge => {
          const source = nodeMap.get(edge.sourceId);
          const target = nodeMap.get(edge.targetId);
          if (!source || !target) return null;

          return (
            <GraphEdge
              key={edge.id}
              edge={edge}
              sourceNode={source}
              targetNode={target}
              isHighlighted={connectedEdgeIds.has(edge.id)}
              isDimmed={!!selectedNodeId && !connectedEdgeIds.has(edge.id)}
              isVisible={isEdgeVisible(edge)}
            />
          );
        })}

        {nodes.map(node => (
          <GraphNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isHovered={hoveredNodeId === node.id}
            isVisible={isNodeVisible(node)}
            onPointerOver={handleNodePointerOver}
            onPointerOut={handleNodePointerOut}
            onClick={handleNodeClick}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={80}
      />
    </>
  );
};

interface SceneProps {
  nodes: NodeData[];
  edges: EdgeData[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hiddenTypes: NodeType[];
  searchFilter: string;
  onNodeClick: (node: NodeData | null) => void;
  onNodeHover: (node: NodeData | null) => void;
  focusTarget: { nodeId: string } | null;
  onFocusComplete: () => void;
}

const Scene = forwardRef<SceneHandle, SceneProps>((props, ref) => {
  const { nodes } = props;

  useImperativeHandle(ref, () => ({
    focusOnNode: () => {},
    resetLayout: () => {}
  }));

  return (
    <Canvas
      camera={{ position: [0, 15, 25], fov: 60 }}
      style={{ background: '#0f172a', width: '100%', height: '100%' }}
      gl={{ antialias: true, pixelRatio: Math.min(window.devicePixelRatio, 2) }}
      shadows
    >
      <SceneContent {...props} />
    </Canvas>
  );
});

Scene.displayName = 'Scene';

export default Scene;
