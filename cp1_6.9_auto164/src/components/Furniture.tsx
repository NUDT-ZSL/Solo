import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FurnitureId, MaterialConfig } from '../types';
import { furnitureController } from '../FurnitureController';

interface FurnitureBaseProps {
  id: FurnitureId;
  material: MaterialConfig;
  selected: boolean;
  onSelect: (id: FurnitureId) => void;
  onDragStart: (id: FurnitureId) => void;
  onDragEnd: (id: FurnitureId) => void;
  isDragging: boolean;
}

export interface FurnitureRefHandle {
  getMeshes: () => THREE.Mesh[];
}

function useMaterialAnimation(id: FurnitureId, material: MaterialConfig, meshes: THREE.Mesh[]) {
  const lastMaterialRef = useRef<string>('');
  useEffect(() => {
    const key = `${material.color}-${material.metalness}-${material.roughness}`;
    if (lastMaterialRef.current && lastMaterialRef.current !== key && meshes.length > 0) {
      furnitureController.queueMaterialAnimation(meshes, material);
    }
    lastMaterialRef.current = key;
  }, [material, meshes, id]);
}

function useFurnitureInteraction(
  id: FurnitureId,
  groupRef: React.RefObject<THREE.Group>,
  onSelect: (id: FurnitureId) => void,
  onDragStart: (id: FurnitureId) => void,
  onDragEnd: (id: FurnitureId) => void,
  selected: boolean,
  isDragging: boolean,
) {
  const localDragging = useRef(false);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect(id);
    localDragging.current = true;
    onDragStart(id);
    if (groupRef.current) {
      groupRef.current.setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (localDragging.current) {
      localDragging.current = false;
      onDragEnd(id);
    }
  };

  const handlePointerCancel = (e: any) => {
    if (localDragging.current) {
      localDragging.current = false;
      onDragEnd(id);
    }
  };

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };
}

export function Sofa({
  id,
  material,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
}: FurnitureBaseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const seatRef = useRef<THREE.Mesh>(null);
  const backRef = useRef<THREE.Mesh>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legFLRef = useRef<THREE.Mesh>(null);
  const legFRRef = useRef<THREE.Mesh>(null);
  const legBLRef = useRef<THREE.Mesh>(null);
  const legBRRef = useRef<THREE.Mesh>(null);
  const state = furnitureController.getState(id)!;

  const meshes = [seatRef, backRef, armLRef, armRRef].filter((r) => r.current) as THREE.Mesh[];
  useMaterialAnimation(id, material, meshes);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position[0], state.position[1], state.position[2]);
    }
  });

  const handlers = useFurnitureInteraction(id, groupRef, onSelect, onDragStart, onDragEnd, selected, isDragging);

  const cushionColor = '#FFFFFF10';
  const legMaterial = { color: '#3A3A3A', metalness: 0.5, roughness: 0.4 };

  return (
    <group ref={groupRef} position={state.position}>
      <mesh ref={seatRef} castShadow receiveShadow position={[0, 0.2, 0]} {...handlers}>
        <boxGeometry args={[2.0, 0.4, 0.9]} />
        <meshStandardMaterial color={material.color} roughness={material.roughness} metalness={material.metalness} />
      </mesh>
      <mesh ref={backRef} castShadow receiveShadow position={[0, 0.6, -0.35]} {...handlers}>
        <boxGeometry args={[2.0, 0.7, 0.22]} />
        <meshStandardMaterial color={material.color} roughness={material.roughness} metalness={material.metalness} />
      </mesh>
      <mesh ref={armLRef} castShadow receiveShadow position={[-0.95, 0.4, 0]} {...handlers}>
        <boxGeometry args={[0.18, 0.55, 0.9]} />
        <meshStandardMaterial color={material.color} roughness={material.roughness} metalness={material.metalness} />
      </mesh>
      <mesh ref={armRRef} castShadow receiveShadow position={[0.95, 0.4, 0]} {...handlers}>
        <boxGeometry args={[0.18, 0.55, 0.9]} />
        <meshStandardMaterial color={material.color} roughness={material.roughness} metalness={material.metalness} />
      </mesh>
      <mesh castShadow position={[-0.55, 0.42, 0.05]}>
        <boxGeometry args={[0.5, 0.15, 0.45]} />
        <meshStandardMaterial color={cushionColor} transparent opacity={0.7} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0.05]}>
        <boxGeometry args={[0.5, 0.15, 0.45]} />
        <meshStandardMaterial color={cushionColor} transparent opacity={0.7} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.55, 0.42, 0.05]}>
        <boxGeometry args={[0.5, 0.15, 0.45]} />
        <meshStandardMaterial color={cushionColor} transparent opacity={0.7} roughness={0.9} />
      </mesh>
      <mesh ref={legFLRef} castShadow position={[-0.88, 0.06, 0.35]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        <meshStandardMaterial color={legMaterial.color} metalness={legMaterial.metalness} roughness={legMaterial.roughness} />
      </mesh>
      <mesh ref={legFRRef} castShadow position={[0.88, 0.06, 0.35]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        <meshStandardMaterial color={legMaterial.color} metalness={legMaterial.metalness} roughness={legMaterial.roughness} />
      </mesh>
      <mesh ref={legBLRef} castShadow position={[-0.88, 0.06, -0.35]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        <meshStandardMaterial color={legMaterial.color} metalness={legMaterial.metalness} roughness={legMaterial.roughness} />
      </mesh>
      <mesh ref={legBRRef} castShadow position={[0.88, 0.06, -0.35]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        <meshStandardMaterial color={legMaterial.color} metalness={legMaterial.metalness} roughness={legMaterial.roughness} />
      </mesh>
      {selected && (
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[2.2, 0.02, 1.1]} />
          <meshBasicMaterial color="#4080FF" transparent opacity={0.25} />
        </mesh>
      )}
      {selected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(2.15, 1.05, 1.05)]} />
          <lineBasicMaterial color="#4080FF" transparent opacity={0.7} linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}

export function CoffeeTable({
  id,
  material,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
}: FurnitureBaseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const topRef = useRef<THREE.Mesh>(null);
  const leg1Ref = useRef<THREE.Mesh>(null);
  const leg2Ref = useRef<THREE.Mesh>(null);
  const leg3Ref = useRef<THREE.Mesh>(null);
  const leg4Ref = useRef<THREE.Mesh>(null);
  const state = furnitureController.getState(id)!;

  const meshes = [topRef, leg1Ref, leg2Ref, leg3Ref, leg4Ref].filter((r) => r.current) as THREE.Mesh[];
  useMaterialAnimation(id, material, meshes);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position[0], state.position[1], state.position[2]);
    }
  });

  const handlers = useFurnitureInteraction(id, groupRef, onSelect, onDragStart, onDragEnd, selected, isDragging);

  return (
    <group ref={groupRef} position={state.position}>
      <mesh ref={topRef} castShadow receiveShadow position={[0, 0.1, 0]} {...handlers}>
        <boxGeometry args={[1.1, 0.06, 0.65]} />
        <meshStandardMaterial color={material.color} metalness={material.metalness} roughness={material.roughness} />
      </mesh>
      {[[-0.48, -0.28], [0.48, -0.28], [-0.48, 0.28], [0.48, 0.28]].map((p, i) => {
        const refs = [leg1Ref, leg2Ref, leg3Ref, leg4Ref];
        return (
          <mesh key={i} ref={refs[i]} castShadow position={[p[0], 0.035, p[1]]} {...handlers}>
            <cylinderGeometry args={[0.025, 0.025, 0.07, 12]} />
            <meshStandardMaterial color={material.color} metalness={material.metalness} roughness={material.roughness} />
          </mesh>
        );
      })}
      {selected && (
        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[1.25, 0.02, 0.8]} />
          <meshBasicMaterial color="#4080FF" transparent opacity={0.25} />
        </mesh>
      )}
      {selected && (
        <lineSegments position={[0, 0.07, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.2, 0.16, 0.75)]} />
          <lineBasicMaterial color="#4080FF" transparent opacity={0.7} />
        </lineSegments>
      )}
    </group>
  );
}

export function FloorLamp({
  id,
  material,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
}: FurnitureBaseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseRef = useRef<THREE.Mesh>(null);
  const poleRef = useRef<THREE.Mesh>(null);
  const shadeRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const state = furnitureController.getState(id)!;
  const emissive = material.emissive || '#FFF8E3';

  const meshes = [baseRef, poleRef, shadeRef].filter((r) => r.current) as THREE.Mesh[];
  useMaterialAnimation(id, material, meshes);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position[0], state.position[1], state.position[2]);
    }
  });

  const handlers = useFurnitureInteraction(id, groupRef, onSelect, onDragStart, onDragEnd, selected, isDragging);

  return (
    <group ref={groupRef} position={state.position}>
      <mesh ref={baseRef} castShadow receiveShadow position={[0, 0.03, 0]} {...handlers}>
        <cylinderGeometry args={[0.18, 0.2, 0.06, 24]} />
        <meshStandardMaterial color={material.color} metalness={material.metalness} roughness={material.roughness} />
      </mesh>
      <mesh ref={poleRef} castShadow position={[0, 0.7, 0]} {...handlers}>
        <cylinderGeometry args={[0.018, 0.018, 1.3, 16]} />
        <meshStandardMaterial color={material.color} metalness={material.metalness} roughness={material.roughness} />
      </mesh>
      <mesh ref={shadeRef} castShadow position={[0, 1.45, 0]} {...handlers}>
        <cylinderGeometry args={[0.15, 0.28, 0.35, 24, 1, true]} />
        <meshStandardMaterial
          color={material.color}
          metalness={Math.min(0.2, material.metalness)}
          roughness={0.3}
          side={THREE.DoubleSide}
          emissive={emissive}
          emissiveIntensity={0.35}
          transparent
          opacity={0.85}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 1.4, 0]}
        color={emissive}
        intensity={1.0}
        distance={5}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0001}
      />
      {selected && (
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.02, 24]} />
          <meshBasicMaterial color="#4080FF" transparent opacity={0.25} />
        </mesh>
      )}
      {selected && (
        <lineSegments position={[0, 0.8, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.6, 1.65, 0.6)]} />
          <lineBasicMaterial color="#4080FF" transparent opacity={0.7} />
        </lineSegments>
      )}
    </group>
  );
}

export function Shelf({
  id,
  material,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
}: FurnitureBaseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sideLRef = useRef<THREE.Mesh>(null);
  const sideRRef = useRef<THREE.Mesh>(null);
  const topRef = useRef<THREE.Mesh>(null);
  const mid1Ref = useRef<THREE.Mesh>(null);
  const mid2Ref = useRef<THREE.Mesh>(null);
  const botRef = useRef<THREE.Mesh>(null);
  const state = furnitureController.getState(id)!;

  const meshes = [sideLRef, sideRRef, topRef, mid1Ref, mid2Ref, botRef].filter((r) => r.current) as THREE.Mesh[];
  useMaterialAnimation(id, material, meshes);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position[0], state.position[1], state.position[2]);
    }
  });

  const handlers = useFurnitureInteraction(id, groupRef, onSelect, onDragStart, onDragEnd, selected, isDragging);
  const shelfHeight = 1.6;
  const levels = [0.04, 0.42, 0.8, 1.18, 1.56];

  return (
    <group ref={groupRef} position={state.position}>
      <mesh ref={sideLRef} castShadow position={[-0.5, shelfHeight / 2, 0]} {...handlers}>
        <boxGeometry args={[0.04, shelfHeight, 0.45]} />
        <meshStandardMaterial color={material.color} metalness={material.metalness} roughness={material.roughness} />
      </mesh>
      <mesh ref={sideRRef} castShadow position={[0.5, shelfHeight / 2, 0]} {...handlers}>
        <boxGeometry args={[0.04, shelfHeight, 0.45]} />
        <meshStandardMaterial color={material.color} metalness={material.metalness} roughness={material.roughness} />
      </mesh>
      {[
        { ref: topRef, y: levels[4] },
        { ref: mid1Ref, y: levels[3] },
        { ref: mid2Ref, y: levels[2] },
        { ref: botRef, y: levels[0] },
      ].map(({ ref, y }, idx) => (
        <mesh key={idx} ref={ref as any} castShadow receiveShadow position={[0, y, 0]} {...handlers}>
          <boxGeometry args={[0.96, 0.035, 0.45]} />
          <meshStandardMaterial color={material.color} metalness={material.metalness} roughness={material.roughness} />
        </mesh>
      ))}
      {levels.slice(1, 4).map((y, idx) => (
        <group key={`decor-${idx}`} position={[(idx - 1) * 0.25, y + 0.12, 0]}>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.15 + idx * 0.03, 0.18 + idx * 0.04, 0.1]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#C9A876' : '#A0785A'}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
        </group>
      ))}
      {selected && (
        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[1.15, 0.02, 0.6]} />
          <meshBasicMaterial color="#4080FF" transparent opacity={0.25} />
        </mesh>
      )}
      {selected && (
        <lineSegments position={[0, shelfHeight / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.1, shelfHeight + 0.04, 0.55)]} />
          <lineBasicMaterial color="#4080FF" transparent opacity={0.7} />
        </lineSegments>
      )}
    </group>
  );
}

export function Carpet({
  id,
  material,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
}: FurnitureBaseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const state = furnitureController.getState(id)!;

  const meshes = meshRef.current ? [meshRef.current] : [];
  useMaterialAnimation(id, material, meshes);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position[0], state.position[1], state.position[2]);
    }
  });

  const handlers = useFurnitureInteraction(id, groupRef, onSelect, onDragStart, onDragEnd, selected, isDragging);

  return (
    <group ref={groupRef} position={state.position}>
      <mesh ref={meshRef} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} {...handlers}>
        <planeGeometry args={[2.6, 2.0]} />
        <meshStandardMaterial
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[1.15, 1.22, 4]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <planeGeometry args={[2.75, 2.15]} />
          <meshBasicMaterial color="#4080FF" transparent opacity={0.2} />
        </mesh>
      )}
      {selected && (
        <lineSegments position={[0, 0.01, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(2.7, 0.03, 2.1)]} />
          <lineBasicMaterial color="#4080FF" transparent opacity={0.8} />
        </lineSegments>
      )}
    </group>
  );
}
