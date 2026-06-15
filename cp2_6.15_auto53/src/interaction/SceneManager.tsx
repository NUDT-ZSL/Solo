import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePartsStore, Part, PartType } from '../store/partsStore';
import { PartMesh } from './PartGeometry';
import {
  snapPositionToGrid,
  checkConnectionCandidates,
  calculateAlignedPosition,
  getWorldInterfacePoint,
  createConnectionParticles,
  updateParticles,
  createSnapPulse,
  updatePulseRings,
  Particle,
  PulseRing,
} from './PartsEngine';
import { animationController } from './AnimationController';

interface DraggablePartProps {
  part: Part;
  onPointerDown: (e: ThreeEvent<PointerEvent>, partId: string) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>, partId: string) => void;
  onPointerOver: (partId: string) => void;
  onPointerOut: () => void;
  onContextMenu: (e: ThreeEvent<MouseEvent>, partId: string, screenPos: { x: number; y: number }) => void;
  onWheel: (e: WheelEvent, partId: string) => void;
}

function DraggablePart({ part, onPointerDown, onPointerUp, onPointerOver, onPointerOut, onContextMenu, onWheel }: DraggablePartProps) {
  const groupRef = useRef<THREE.Group>(null);
  const store = usePartsStore();
  const targetPos = useRef(new THREE.Vector3().copy(part.position));
  const targetRot = useRef(new THREE.Euler().copy(part.rotation));

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (part.isDragging) {
      groupRef.current.position.copy(part.position);
      groupRef.current.rotation.copy(part.rotation);
    } else {
      const lerpFactor = 1 - Math.pow(0.001, delta);
      targetPos.current.copy(part.position);
      targetRot.current.copy(part.rotation);
      groupRef.current.position.lerp(targetPos.current, lerpFactor);
      groupRef.current.rotation.set(
        groupRef.current.rotation.x + (targetRot.current.x - groupRef.current.rotation.x) * lerpFactor,
        groupRef.current.rotation.y + (targetRot.current.y - groupRef.current.rotation.y) * lerpFactor,
        groupRef.current.rotation.z + (targetRot.current.z - groupRef.current.rotation.z) * lerpFactor
      );
    }
    groupRef.current.scale.copy(part.scale);
  });

  useEffect(() => {
    const el = document.createElement('div');
    el.style.display = 'none';
  }, []);

  return (
    <group
      ref={groupRef}
      position={part.position.toArray()}
      rotation={part.rotation.toArray()}
      scale={part.scale.toArray()}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e, part.id);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onPointerUp(e, part.id);
      }}
      onPointerOver={() => onPointerOver(part.id)}
      onPointerOut={onPointerOut}
      onContextMenu={(e) => {
        e.stopPropagation();
        const rect = (e.target as any).ownerDocument?.documentElement?.getBoundingClientRect?.();
        onContextMenu(e, part.id, { x: e.clientX ?? 0, y: e.clientY ?? 0 });
      }}
      onWheel={(e) => {
        e.stopPropagation();
        onWheel(e.nativeEvent, part.id);
      }}
    >
      <PartMesh part={part} selected={part.isSelected} opacity={part.isDragging ? 0.55 : 1} />
    </group>
  );
}

interface SceneContentProps {
  onContextMenu: (partId: string | null, pos: { x: number; y: number }) => void;
  closeContextMenu: () => void;
  contextMenuOpen: boolean;
}

function SceneContent({ onContextMenu, closeContextMenu, contextMenuOpen }: SceneContentProps) {
  const { camera, gl } = useThree();
  const store = usePartsStore();
  const parts = usePartsStore((s) => s.parts);
  const hoveredConnection = usePartsStore((s) => s.hoveredConnection);
  const cameraPos = usePartsStore((s) => s.cameraPosition);
  const cameraTarget = usePartsStore((s) => s.cameraTarget);
  const controlsRef = useRef<any>(null);

  const [draggingPartId, setDraggingPartId] = useState<string | null>(null);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const pointerWorldPos = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const pointerNDC = useRef(new THREE.Vector2());

  const [particles, setParticles] = useState<Particle[]>([]);
  const [pulseRings, setPulseRings] = useState<PulseRing[]>([]);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);

  const cameraAnimTargetPos = useRef(new THREE.Vector3().copy(cameraPos));
  const cameraAnimTargetLook = useRef(new THREE.Vector3().copy(cameraTarget));

  useEffect(() => {
    cameraAnimTargetPos.current.copy(cameraPos);
    cameraAnimTargetLook.current.copy(cameraTarget);
  }, [cameraPos, cameraTarget]);

  useFrame((state, delta) => {
    const lerpFactor = 1 - Math.pow(0.0001, delta);
    camera.position.lerp(cameraAnimTargetPos.current, lerpFactor);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(cameraAnimTargetLook.current, lerpFactor);
      controlsRef.current.update();
    }

    if (draggingPartId && draggingPartId.length > 0) {
      const part = store.parts.find((p) => p.id === draggingPartId);
      if (part && pointerWorldPos.current) {
        const newPos = pointerWorldPos.current.clone().add(dragOffset.current);
        newPos.y = part.dimensions.height / 2;
        store.setPartPosition(draggingPartId, newPos);

        const candidate = checkConnectionCandidates(part, store.parts);
        if (candidate) {
          store.setHoveredConnection({ partAId: candidate.partA.id, partBId: candidate.partB.id });
        } else {
          store.setHoveredConnection(null);
        }
      }
    }

    setParticles((prev) => updateParticles(prev, delta));
    setPulseRings((prev) => updatePulseRings(prev, delta));
  });

  const updatePointerWorld = useCallback((clientX: number, clientY: number, height: number) => {
    pointerNDC.current.x = (clientX / window.innerWidth) * 2 - 1;
    pointerNDC.current.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.current.setFromCamera(pointerNDC.current, camera);
    raycaster.current.ray.intersectPlane(dragPlane.current, pointerWorldPos.current);
  }, [camera]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (draggingPartId) {
        updatePointerWorld(e.clientX, e.clientY, window.innerHeight);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [draggingPartId, updatePointerWorld]);

  const handlePartPointerDown = useCallback((e: ThreeEvent<PointerEvent>, partId: string) => {
    if (store.isAnimating) return;
    if (e.button !== 0) return;
    closeContextMenu();

    const part = store.parts.find((p) => p.id === partId);
    if (!part) return;

    store.selectPart(partId);

    updatePointerWorld(e.clientX, e.clientY, window.innerHeight);
    dragPlane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, part.dimensions.height / 2, 0)
    );

    raycaster.current.setFromCamera(
      new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      ),
      camera
    );
    const intersectPoint = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint);
    dragOffset.current.copy(part.position).sub(intersectPoint);

    store.startDrag(partId);
    setDraggingPartId(partId);
    (e.target as any).setPointerCapture?.(e.pointerId);
  }, [store, camera, updatePointerWorld, closeContextMenu]);

  const handlePartPointerUp = useCallback(async (e: ThreeEvent<PointerEvent>, partId: string) => {
    if (!draggingPartId || draggingPartId !== partId) return;

    const part = store.parts.find((p) => p.id === partId);
    if (!part) {
      store.endDrag(partId);
      setDraggingPartId(null);
      return;
    }

    const snappedPos = snapPositionToGrid(part.position);
    store.setPartPosition(partId, snappedPos);

    setPulseRings((prev) => [...prev, createSnapPulse(new THREE.Vector3(snappedPos.x, 0.01, snappedPos.z))]);

    const candidate = checkConnectionCandidates(part, store.parts);
    store.setHoveredConnection(null);

    if (candidate) {
      const { tenonPos, tenonRot } = calculateAlignedPosition(candidate.partA, candidate.partB);
      const tenonId = candidate.partA.id;
      const mortiseId = candidate.partB.id;

      store.addConnection(tenonId, mortiseId);

      const midPoint = getWorldInterfacePoint(candidate.partB);
      setParticles((prev) => [...prev, ...createConnectionParticles(midPoint, 22)]);

      await animationController.animateConnection(tenonId, mortiseId, tenonPos, tenonRot);
    }

    store.endDrag(partId);
    setDraggingPartId(null);
  }, [draggingPartId, store]);

  const handlePartContextMenu = useCallback((e: ThreeEvent<MouseEvent>, partId: string, screenPos: { x: number; y: number }) => {
    e.preventDefault();
    store.selectPart(partId);
    onContextMenu(partId, screenPos);
  }, [store, onContextMenu]);

  const handlePartWheel = useCallback((e: WheelEvent, partId: string) => {
    if (draggingPartId) return;
    if (store.isAnimating) return;
    e.preventDefault();
    const angle = e.deltaY > 0 ? Math.PI / 12 : -Math.PI / 12;
    store.rotatePartBy(partId, angle);
  }, [draggingPartId, store]);

  const handlePointerOver = useCallback((partId: string) => {
    setHoveredPartId(partId);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoveredPartId(null);
    if (!draggingPartId) {
      document.body.style.cursor = 'default';
    }
  }, [draggingPartId]);

  const connectionHighlightParts = useMemo(() => {
    if (!hoveredConnection) return null;
    const partA = store.parts.find((p) => p.id === hoveredConnection.partAId);
    const partB = store.parts.find((p) => p.id === hoveredConnection.partBId);
    if (!partA || !partB) return null;
    const pointA = getWorldInterfacePoint(partA);
    const pointB = getWorldInterfacePoint(partB);
    return { pointA, pointB, mid: pointA.clone().add(pointB).multiplyScalar(0.5) };
  }, [hoveredConnection, store.parts]);

  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPos.toArray()} fov={45} near={0.1} far={1000} />
      <OrbitControls
        ref={controlsRef}
        target={cameraTarget.toArray()}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.05}
        enablePan={true}
        panSpeed={0.8}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-8, 6, -5]} intensity={0.4} />
      <hemisphereLight args={['#fff4e6', '#6b5030', 0.3]} />

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={1}
        cellColor="#c49a5a"
        sectionSize={2.5}
        sectionThickness={1.5}
        sectionColor="#a8804a"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#d4a76a" roughness={0.9} metalness={0} />
      </mesh>

      {parts.map((part) => (
        <DraggablePart
          key={part.id}
          part={part}
          onPointerDown={handlePartPointerDown}
          onPointerUp={handlePartPointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onContextMenu={handlePartContextMenu}
          onWheel={handlePartWheel}
        />
      ))}

      {connectionHighlightParts && (
        <ConnectionHighlight mid={connectionHighlightParts.mid} />
      )}

      {particles.map((p) => (
        <mesh key={p.id} position={p.position.toArray()}>
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={p.life / p.maxLife} />
        </mesh>
      ))}

      {pulseRings.map((ring) => (
        <mesh key={ring.id} position={[ring.position.x, 0.02, ring.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring.radius * 0.7, ring.radius, 48]} />
          <meshBasicMaterial color={ring.color} transparent opacity={(ring.life / ring.maxLife) * 0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function ConnectionHighlight({ mid }: { mid: THREE.Vector3 }) {
  const boxRef = useRef<THREE.LineSegments>(null);
  const timeRef = useRef(0);
  const baseSize = 0.55;

  const geometry = useMemo(() => {
    const boxGeo = new THREE.BoxGeometry(baseSize, baseSize, baseSize);
    const edges = new THREE.EdgesGeometry(boxGeo);
    return edges;
  }, []);

  const material = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: '#ffdd44',
      dashSize: 0.08,
      gapSize: 0.05,
      linewidth: 2,
      transparent: true,
      opacity: 1,
    });
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (boxRef.current) {
      const pulse = 1 + Math.sin(timeRef.current * Math.PI * 2) * 0.18;
      boxRef.current.scale.setScalar(pulse);
      (boxRef.current.material as THREE.LineDashedMaterial).opacity = 0.6 + Math.sin(timeRef.current * Math.PI * 2) * 0.4;
      boxRef.current.computeLineDistances();
    }
  });

  return (
    <group position={mid.toArray()}>
      <lineSegments ref={boxRef} geometry={geometry} material={material} />
    </group>
  );
}

interface ContextMenuState {
  open: boolean;
  partId: string | null;
  x: number;
  y: number;
}

export function SceneManager() {
  const store = usePartsStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ open: false, partId: null, x: 0, y: 0 });

  const handleContextMenu = useCallback((partId: string | null, pos: { x: number; y: number }) => {
    setContextMenu({ open: true, partId, x: pos.x, y: pos.y });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ open: false, partId: null, x: 0, y: 0 });
  }, []);

  const handleDisassemble = useCallback(() => {
    if (!contextMenu.partId) return;
    const partId = contextMenu.partId;
    closeContextMenu();
    animationController.animateDisassemblePart(partId, 0);
  }, [contextMenu.partId, closeContextMenu]);

  const handleDuplicate = useCallback(() => {
    if (!contextMenu.partId) return;
    store.duplicatePart(contextMenu.partId);
    closeContextMenu();
  }, [contextMenu.partId, store, closeContextMenu]);

  const handleDelete = useCallback(() => {
    if (!contextMenu.partId) return;
    store.removePart(contextMenu.partId);
    closeContextMenu();
  }, [contextMenu.partId, store, closeContextMenu]);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeContextMenu(); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [closeContextMenu]);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} onContextMenu={handleCanvasContextMenu}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'linear-gradient(180deg, #f5e6d0 0%, #e8d4b8 100%)' }}
      >
        <SceneContent
          onContextMenu={handleContextMenu}
          closeContextMenu={closeContextMenu}
          contextMenuOpen={contextMenu.open}
        />
      </Canvas>

      {contextMenu.open && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 180),
            left: Math.min(contextMenu.x, window.innerWidth - 160),
            background: '#3a3a3a',
            borderRadius: '6px',
            padding: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 10000,
            minWidth: '140px',
            border: '1px solid #555',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem label="拆解" icon="🔓" onClick={handleDisassemble} />
          <ContextMenuItem label="复制" icon="📋" onClick={handleDuplicate} />
          <ContextMenuItem label="删除" icon="🗑️" onClick={handleDelete} danger />
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        color: danger ? '#ff8a8a' : '#e8e8e8',
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? '#5a2a2a' : '#4a4a4a';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
