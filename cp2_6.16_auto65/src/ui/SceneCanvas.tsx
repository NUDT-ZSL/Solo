import React, { useRef, useMemo, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useStore } from '@/store/useStore';
import { sceneManager } from '@/core/sceneManager';
import { MAX_NODES, BOUNDS_RADIUS, SculptureNode, Connection } from '@/types/index';

export interface SceneCanvasHandle {
  exportSnapshot: () => Promise<void>;
}

interface SceneContentProps {
  forwardedRef: React.Ref<SceneCanvasHandle>;
}

const SceneContent: React.FC<SceneContentProps> = ({ forwardedRef }) => {
  const { gl, scene, camera } = useThree();

  useImperativeHandle(
    forwardedRef,
    () => ({
      exportSnapshot: async () => {
        await sceneManager.exportSnapshot(gl, scene, camera);
      },
    }),
    [gl, scene, camera]
  );
  const nodes = useStore((state) => state.nodes);
  const connections = useStore((state) => state.connections);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const isDraggingNode = useStore((state) => state.isDraggingNode);
  const shiftHeld = useStore((state) => state.shiftHeld);
  const frequencyData = useStore((state) => state.frequencyData);
  const selectNode = useStore((state) => state.selectNode);
  const addNode = useStore((state) => state.addNode);
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const updateConnectionStrength = useStore((state) => state.updateConnectionStrength);
  const setIsDraggingNode = useStore((state) => state.setIsDraggingNode);

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const lineSegmentsRef = useRef<THREE.LineSegments>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const draggingNodeIdRef = useRef<string | null>(null);
  const pointerDownRef = useRef<boolean>(false);
  const dragThresholdRef = useRef<number>(0);

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const nodeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0x000000,
        emissiveIntensity: 1,
      }),
    []
  );

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        vertexColors: true,
      }),
    []
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        useStore.getState().setShiftHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        useStore.getState().setShiftHeld(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    sceneManager.updatePhysics(delta);
    sceneManager.updateTransition();
    sceneManager.applyAudioData(frequencyData);

    if (instancedMeshRef.current) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const isSelected = selectedNodeId === node.id;
        const scale = isSelected ? 1.1 : 1;

        dummy.position.set(node.position.x, node.position.y, node.position.z);
        dummy.scale.setScalar(node.size * scale);
        dummy.updateMatrix();
        instancedMeshRef.current.setMatrixAt(i, dummy.matrix);

        const color = new THREE.Color(node.color);
        const emissiveIntensity = isSelected ? node.emissiveIntensity * 1.5 : node.emissiveIntensity;
        const finalColor = color.clone().multiplyScalar(emissiveIntensity);
        instancedMeshRef.current.setColorAt(i, finalColor);
      }
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      if (instancedMeshRef.current.instanceColor) {
        instancedMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (lineSegmentsRef.current && lineSegmentsRef.current.geometry) {
      const positions = lineSegmentsRef.current.geometry.attributes.position.array as Float32Array;
      const colors = lineSegmentsRef.current.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        const fromNode = nodes.find((n) => n.id === conn.fromId);
        const toNode = nodes.find((n) => n.id === conn.toId);
        if (!fromNode || !toNode) continue;

        const posIdx = i * 6;
        positions[posIdx] = fromNode.position.x;
        positions[posIdx + 1] = fromNode.position.y;
        positions[posIdx + 2] = fromNode.position.z;
        positions[posIdx + 3] = toNode.position.x;
        positions[posIdx + 4] = toNode.position.y;
        positions[posIdx + 5] = toNode.position.z;

        const colorIdx = i * 6;
        const fromColor = new THREE.Color(fromNode.color);
        const toColor = new THREE.Color(toNode.color);
        const avgColor = new THREE.Color().lerpColors(fromColor, toColor, 0.5);

        colors[colorIdx] = avgColor.r;
        colors[colorIdx + 1] = avgColor.g;
        colors[colorIdx + 2] = avgColor.b;
        colors[colorIdx + 3] = avgColor.r;
        colors[colorIdx + 4] = avgColor.g;
        colors[colorIdx + 5] = avgColor.b;
      }

      lineSegmentsRef.current.geometry.attributes.position.needsUpdate = true;
      lineSegmentsRef.current.geometry.attributes.color.needsUpdate = true;
      lineMaterial.opacity = useStore.getState().connectionOpacity;
    }
  });

  const getIntersectionPoint = useCallback(
    (event: { clientX: number; clientY: number }): THREE.Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, intersection);

      return intersection;
    },
    [gl, camera]
  );

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.button !== 0) return;

      pointerDownRef.current = true;
      dragThresholdRef.current = 0;

      if (instancedMeshRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const intersects = raycasterRef.current.intersectObject(instancedMeshRef.current);

        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
          const instanceId = intersects[0].instanceId;
          if (instanceId < nodes.length) {
            const clickedNode = nodes[instanceId];
            draggingNodeIdRef.current = clickedNode.id;

            if (shiftHeld && selectedNodeId && selectedNodeId !== clickedNode.id) {
              const existingConn = connections.find(
                (c) =>
                  (c.fromId === selectedNodeId && c.toId === clickedNode.id) ||
                  (c.fromId === clickedNode.id && c.toId === selectedNodeId)
              );
              if (existingConn) {
                return;
              }
            }

            setIsDraggingNode(true);
          }
        }
      }
    },
    [camera, nodes, connections, selectedNodeId, shiftHeld, setIsDraggingNode]
  );

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (!pointerDownRef.current) return;

      dragThresholdRef.current++;

      if (draggingNodeIdRef.current) {
        const intersection = getIntersectionPoint(event);
        if (intersection) {
          const nodeId = draggingNodeIdRef.current;

          if (shiftHeld && selectedNodeId && selectedNodeId !== nodeId) {
            const fromNode = nodes.find((n) => n.id === selectedNodeId);
            const toNode = nodes.find((n) => n.id === nodeId);
            if (fromNode && toNode) {
              const dx = intersection.x - fromNode.position.x;
              const dy = intersection.y - fromNode.position.y;
              const dz = intersection.z - fromNode.position.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              const strength = Math.max(0, Math.min(1, 1 - dist / 30));
              updateConnectionStrength(selectedNodeId, nodeId, strength);
            }
          } else {
            const dist = Math.sqrt(
              intersection.x * intersection.x +
                intersection.y * intersection.y +
                intersection.z * intersection.z
            );
            let clampedPos = { x: intersection.x, y: intersection.y, z: intersection.z };
            if (dist > BOUNDS_RADIUS) {
              const scale = BOUNDS_RADIUS / dist;
              clampedPos = {
                x: intersection.x * scale,
                y: intersection.y * scale,
                z: intersection.z * scale,
              };
            }
            updateNodePosition(nodeId, clampedPos);
            sceneManager.enforceBounds();
          }
        }
      }
    },
    [gl, camera, getIntersectionPoint, shiftHeld, selectedNodeId, nodes, updateNodePosition, updateConnectionStrength]
  );

  const handlePointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.button !== 0) return;

      pointerDownRef.current = false;

      if (draggingNodeIdRef.current) {
        const nodeId = draggingNodeIdRef.current;
        draggingNodeIdRef.current = null;
        setIsDraggingNode(false);

        if (dragThresholdRef.current < 3) {
          if (shiftHeld) {
            const currentSelected = useStore.getState().selectedNodeId;
            if (currentSelected && currentSelected !== nodeId) {
              const existingConn = useStore.getState().connections.find(
                (c) =>
                  (c.fromId === currentSelected && c.toId === nodeId) ||
                  (c.fromId === nodeId && c.toId === currentSelected)
              );
              if (!existingConn) {
                const fromNode = nodes.find((n) => n.id === currentSelected);
                const toNode = nodes.find((n) => n.id === nodeId);
                if (fromNode && toNode) {
                  const dx = toNode.position.x - fromNode.position.x;
                  const dy = toNode.position.y - fromNode.position.y;
                  const dz = toNode.position.z - fromNode.position.z;
                  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                  const newConnection = {
                    fromId: currentSelected,
                    toId: nodeId,
                    strength: 0.5,
                    opacity: 0.5,
                    restLength: dist,
                  };
                  const currentConnections = useStore.getState().connections;
                  useStore.getState().setConnections([...currentConnections, newConnection]);
                }
              }
            }
          } else {
            selectNode(nodeId);
          }
        }
        return;
      }

      if (dragThresholdRef.current < 3 && !isDraggingNode && !shiftHeld) {
        const intersection = getIntersectionPoint(event);
        if (intersection && nodes.length < MAX_NODES) {
          const dist = Math.sqrt(
            intersection.x * intersection.x +
              intersection.y * intersection.y +
              intersection.z * intersection.z
          );
          let clampedPos = { x: intersection.x, y: intersection.y, z: intersection.z };
          if (dist > BOUNDS_RADIUS) {
            const scale = BOUNDS_RADIUS / dist;
            clampedPos = {
              x: intersection.x * scale,
              y: intersection.y * scale,
              z: intersection.z * scale,
            };
          }
          addNode(clampedPos);
        }
      }

      dragThresholdRef.current = 0;
    },
    [isDraggingNode, shiftHeld, nodes.length, selectNode, addNode, getIntersectionPoint, setIsDraggingNode]
  );

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const maxConnections = MAX_NODES * 3;
    const positions = new Float32Array(maxConnections * 6);
    const colors = new Float32Array(maxConnections * 6);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, connections.length * 2);
    return geometry;
  }, []);

  useEffect(() => {
    if (lineSegmentsRef.current && lineSegmentsRef.current.geometry) {
      lineSegmentsRef.current.geometry.setDrawRange(0, connections.length * 2);
    }
  }, [connections.length]);

  return (
    <>
      <ambientLight color={0x111122} intensity={0.3} />
      <pointLight color={0xffffff} intensity={2} position={[30, 30, 30]} />

      <instancedMesh
        ref={instancedMeshRef}
        args={[sphereGeometry, nodeMaterial, MAX_NODES]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={(e) => {
          pointerDownRef.current = false;
          if (draggingNodeIdRef.current) {
            draggingNodeIdRef.current = null;
            setIsDraggingNode(false);
          }
        }}
      />

      <lineSegments ref={lineSegmentsRef} geometry={lineGeometry} material={lineMaterial} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enablePan={false}
        minDistance={15}
        maxDistance={80}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={1.5} radius={0.4} />
      </EffectComposer>
    </>
  );
};

const SceneCanvas = forwardRef<SceneCanvasHandle>((_, ref) => {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 45], fov: 60 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <SceneContent forwardedRef={ref} />
    </Canvas>
  );
});

SceneCanvas.displayName = 'SceneCanvas';

export default SceneCanvas;
