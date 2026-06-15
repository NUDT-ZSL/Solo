import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlantStore } from './store';
import { BranchData } from './utils/lSystem';

interface BranchMeshProps {
  branch: BranchData;
  trunkColorBottom: string;
  trunkColorTop: string;
  leafColor: string;
  onClick: (branchId: string) => void;
  isClickable: boolean;
}

const BranchMesh = ({
  branch,
  trunkColorBottom,
  trunkColorTop,
  leafColor,
  onClick,
  isClickable,
}: BranchMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tipRef = useRef<THREE.Mesh>(null);

  const { position, rotation, scale } = useMemo(() => {
    const direction = new THREE.Vector3()
      .subVectors(branch.end, branch.start)
      .normalize();
    const length = branch.start.distanceTo(branch.end);

    const growProgress = branch.growProgress;
    const pruneProgress = branch.pruneProgress;

    const effectiveProgress = Math.max(0, growProgress - pruneProgress);
    const currentLength = length * effectiveProgress;

    const midPoint = new THREE.Vector3()
      .copy(branch.start)
      .add(direction.clone().multiplyScalar(currentLength / 2));

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    const radiusScale = 1 - pruneProgress * 0.5;

    return {
      position: midPoint,
      rotation: new THREE.Euler(euler.x, euler.y, euler.z),
      scale: new THREE.Vector3(
        branch.radius * radiusScale,
        currentLength / 2,
        branch.radius * radiusScale
      ),
    };
  }, [branch]);

  const color = useMemo(() => {
    if (branch.isLeaf) {
      return leafColor;
    }
    const maxLevel = 8;
    const t = branch.level / maxLevel;
    return t < 0.5 ? trunkColorBottom : trunkColorTop;
  }, [branch, trunkColorBottom, trunkColorTop, leafColor]);

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (isClickable && !branch.isPruned && branch.growProgress >= 1) {
        onClick(branch.id);
      }
    },
    [branch, onClick, isClickable]
  );

  const opacity = useMemo(() => {
    return Math.max(0, branch.opacity * (1 - branch.pruneProgress));
  }, [branch.opacity, branch.pruneProgress]);

  const tipPosition = useMemo(() => {
    const direction = new THREE.Vector3()
      .subVectors(branch.end, branch.start)
      .normalize();
    const growProgress = branch.growProgress;
    const pruneProgress = branch.pruneProgress;
    const effectiveProgress = Math.max(0, growProgress - pruneProgress);
    const length = branch.start.distanceTo(branch.end);
    return branch.start
      .clone()
      .add(direction.clone().multiplyScalar(length * effectiveProgress));
  }, [branch]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        rotation={rotation}
        scale={scale}
        castShadow
        receiveShadow
        onClick={handleClick}
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {isClickable &&
        !branch.isPruned &&
        branch.growProgress >= 1 &&
        branch.children.length >= 0 && (
          <mesh
            ref={tipRef}
            position={tipPosition}
            onClick={handleClick}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[branch.radius * 1.5, 8, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              transparent
              opacity={0.0}
              emissive="#ffffff"
              emissiveIntensity={0}
            />
          </mesh>
        )}
    </group>
  );
};

const Ground = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
      <circleGeometry args={[5, 32]} />
      <meshStandardMaterial
        color="#1a2332"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
};

const PruneAnimationController = () => {
  const [activePrune, setActivePrune] = useState<{
    branchId: string;
    startTime: number;
  } | null>(null);

  const pruneBranch = usePlantStore((state) => state.pruneBranch);
  const updatePruneProgress = usePlantStore((state) => state.updatePruneProgress);
  const removePrunedBranches = usePlantStore(
    (state) => state.removePrunedBranches
  );

  const handlePrune = useCallback((branchId: string) => {
    pruneBranch(branchId);
    setActivePrune({ branchId, startTime: performance.now() });
  }, [pruneBranch]);

  useEffect(() => {
    (window as any).__pruneBranch = handlePrune;
    return () => {
      delete (window as any).__pruneBranch;
    };
  }, [handlePrune]);

  useFrame(() => {
    if (!activePrune) return;

    const elapsed = (performance.now() - activePrune.startTime) / 1000;
    const duration = 0.5;
    const progress = Math.min(1, elapsed / duration);

    updatePruneProgress(activePrune.branchId, progress);

    if (progress >= 1) {
      removePrunedBranches(activePrune.branchId);
      setActivePrune(null);
    }
  });

  return null;
};

export const Plant = () => {
  const branches = usePlantStore((state) => state.branches);
  const generation = usePlantStore((state) => state.generation);
  const trunkColorBottom = usePlantStore((state) => state.trunkColorBottom);
  const trunkColorTop = usePlantStore((state) => state.trunkColorTop);
  const leafColor = usePlantStore((state) => state.leafColor);
  const isGrowing = usePlantStore((state) => state.isGrowing);
  const updateGrowthProgress = usePlantStore(
    (state) => state.updateGrowthProgress
  );
  const updateColorTransition = usePlantStore(
    (state) => state.updateColorTransition
  );
  const colorTransition = usePlantStore((state) => state.colorTransition);

  const lastTimeRef = useRef(performance.now());

  useFrame(({ clock }) => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    if (isGrowing) {
      updateGrowthProgress(currentTime);
    }

    if (colorTransition.active) {
      updateColorTransition(deltaTime);
    }
  });

  const handleBranchClick = useCallback((branchId: string) => {
    if ((window as any).__pruneBranch) {
      (window as any).__pruneBranch(branchId);
    }
  }, []);

  const visibleBranches = useMemo(() => {
    return branches.filter((b) => b.growProgress > 0 || b.opacity > 0);
  }, [branches]);

  return (
    <group key={generation}>
      <PruneAnimationController />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#87ceeb', '#2d4a3e', 0.6]} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#6699ff" />

      <Ground />

      {visibleBranches.map((branch) => (
        <BranchMesh
          key={branch.id}
          branch={branch}
          trunkColorBottom={trunkColorBottom}
          trunkColorTop={trunkColorTop}
          leafColor={leafColor}
          onClick={handleBranchClick}
          isClickable={!isGrowing}
        />
      ))}

      <fog attach="fog" args={['#0b0f19', 3, 12]} />
    </group>
  );
};
