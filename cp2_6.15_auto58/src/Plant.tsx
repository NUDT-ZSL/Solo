import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlantStore } from './store';
import { BranchData, getBranchAndChildren } from './utils/lSystem';

const createBranchGeometry = () => {
  return new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);
};

const createTipGeometry = () => {
  return new THREE.SphereGeometry(1, 8, 8);
};

const hexToRgbFloat = (hex: string): THREE.Color => {
  return new THREE.Color(hex);
};

interface MergedBranchesProps {
  branches: BranchData[];
  trunkColorBottom: string;
  trunkColorTop: string;
  leafColor: string;
  onPrune: (branchId: string) => void;
  isClickable: boolean;
}

const MergedBranches = ({
  branches,
  trunkColorBottom,
  trunkColorTop,
  leafColor,
  onPrune,
  isClickable,
}: MergedBranchesProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tipMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { camera, raycaster, pointer } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeBranches = useMemo(() => {
    return branches.filter((b) => b.growProgress > 0 || b.opacity > 0 || b.pruneProgress > 0);
  }, [branches]);

  const branchColors = useMemo(() => {
    return activeBranches.map((branch) => {
      if (branch.isLeaf) {
        return hexToRgbFloat(leafColor);
      }
      const maxLevel = 8;
      const t = branch.level / maxLevel;
      const startColor = hexToRgbFloat(trunkColorBottom);
      const endColor = hexToRgbFloat(trunkColorTop);
      return startColor.clone().lerp(endColor, t);
    });
  }, [activeBranches, trunkColorBottom, trunkColorTop, leafColor]);

  const instanceIdToBranchId = useMemo(() => {
    const map = new Map<number, string>();
    activeBranches.forEach((branch, index) => {
      map.set(index, branch.id);
    });
    return map;
  }, [activeBranches]);

  const branchIdToIndex = useMemo(() => {
    const map = new Map<string, number>();
    activeBranches.forEach((branch, index) => {
      map.set(branch.id, index);
    });
    return map;
  }, [activeBranches]);

  useFrame(() => {
    if (!meshRef.current) return;

    activeBranches.forEach((branch, i) => {
      const direction = new THREE.Vector3()
        .subVectors(branch.end, branch.start)
        .normalize();
      const fullLength = branch.start.distanceTo(branch.end);

      const growProgress = branch.growProgress;
      const pruneProgress = branch.pruneProgress;
      const effectiveProgress = Math.max(0, growProgress - pruneProgress);
      const currentLength = fullLength * effectiveProgress;

      const midPoint = new THREE.Vector3()
        .copy(branch.start)
        .add(direction.clone().multiplyScalar(currentLength / 2));

      dummy.position.copy(midPoint);

      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      dummy.quaternion.copy(quaternion);

      const radiusScale = 1 - pruneProgress * 0.5;
      const radius = branch.radius * radiusScale;
      dummy.scale.set(radius, currentLength / 2, radius);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      const opacity = Math.max(0, branch.opacity * (1 - pruneProgress));
      const color = branchColors[i].clone();
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    if (tipMeshRef.current) {
      activeBranches.forEach((branch, i) => {
        if (!isClickable || branch.isPruned || branch.growProgress < 1) {
          dummy.scale.set(0, 0, 0);
        } else {
          const direction = new THREE.Vector3()
            .subVectors(branch.end, branch.start)
            .normalize();
          const fullLength = branch.start.distanceTo(branch.end);
          const growProgress = branch.growProgress;
          const pruneProgress = branch.pruneProgress;
          const effectiveProgress = Math.max(0, growProgress - pruneProgress);

          const tipPos = branch.start
            .clone()
            .add(direction.clone().multiplyScalar(fullLength * effectiveProgress));

          dummy.position.copy(tipPos);
          dummy.quaternion.identity();
          const scale = branch.radius * 2 * (hoveredId === branch.id ? 1.5 : 1);
          dummy.scale.set(scale, scale, scale);
        }

        dummy.updateMatrix();
        tipMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      tipMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const handlePointerMove = useCallback(
    (event: any) => {
      if (!tipMeshRef.current || !isClickable) return;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(tipMeshRef.current);

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined) {
          const branchId = instanceIdToBranchId.get(instanceId);
          if (branchId && branchId !== hoveredId) {
            setHoveredId(branchId);
            document.body.style.cursor = 'pointer';
          }
        }
      } else if (hoveredId) {
        setHoveredId(null);
        document.body.style.cursor = 'auto';
      }
    },
    [pointer, camera, raycaster, instanceIdToBranchId, hoveredId, isClickable]
  );

  const handleClick = useCallback(
    (event: any) => {
      if (!tipMeshRef.current || !isClickable) return;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(tipMeshRef.current);

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined) {
          const branchId = instanceIdToBranchId.get(instanceId);
          if (branchId) {
            const branch = activeBranches.find((b) => b.id === branchId);
            if (branch && !branch.isPruned && branch.growProgress >= 1) {
              event.stopPropagation();
              onPrune(branchId);
            }
          }
        }
      }
    },
    [pointer, camera, raycaster, instanceIdToBranchId, activeBranches, isClickable, onPrune]
  );

  return (
    <group onPointerMove={handlePointerMove} onClick={handleClick}>
      <instancedMesh
        ref={meshRef}
        args={[createBranchGeometry(), undefined, activeBranches.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          transparent
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
          vertexColors
        />
      </instancedMesh>

      <instancedMesh
        ref={tipMeshRef}
        args={[createTipGeometry(), undefined, activeBranches.length]}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.01}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
};

const Ground = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
      <circleGeometry args={[5, 32]} />
      <meshStandardMaterial color="#1a2332" roughness={0.9} metalness={0.1} />
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
  const removePrunedBranches = usePlantStore((state) => state.removePrunedBranches);

  const handlePrune = useCallback(
    (branchId: string) => {
      pruneBranch(branchId);
      setActivePrune({ branchId, startTime: performance.now() });
    },
    [pruneBranch]
  );

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
  const updateGrowthProgress = usePlantStore((state) => state.updateGrowthProgress);
  const updateColorTransition = usePlantStore((state) => state.updateColorTransition);
  const colorTransition = usePlantStore((state) => state.colorTransition);

  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
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

  const handlePrune = useCallback((branchId: string) => {
    if ((window as any).__pruneBranch) {
      (window as any).__pruneBranch(branchId);
    }
  }, []);

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

      <MergedBranches
        branches={branches}
        trunkColorBottom={trunkColorBottom}
        trunkColorTop={trunkColorTop}
        leafColor={leafColor}
        onPrune={handlePrune}
        isClickable={!isGrowing}
      />

      <fog attach="fog" args={['#0b0f19', 3, 12]} />
    </group>
  );
};
