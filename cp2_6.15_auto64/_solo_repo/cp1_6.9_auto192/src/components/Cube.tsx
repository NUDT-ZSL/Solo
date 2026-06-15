import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { InteractionState } from '@/hooks/useInteraction';

const CUBE_SIZE = 1;
const DEFAULT_GAP = 1.5;
const GAP_AMPLITUDE = 0.3;
const BREATHE_PERIOD = 2;
const SNAP_DURATION = 1.5;
const SNAP_INTERVAL = Math.PI / 2;

interface CubeProps {
  interaction: InteractionState;
  setRotation: (x: number, y: number) => void;
  ambientColor: THREE.Color;
}

const hslToColor = (h: number, s: number, l: number): THREE.Color => {
  const color = new THREE.Color();
  color.setHSL(h / 360, s / 100, l / 100);
  return color;
};

const easeOut = (t: number): number => {
  // cubic-bezier(0.25, 0.1, 0.25, 1) approximated
  return 1 - Math.pow(1 - t, 3);
};

const snapToNearest = (angle: number): number => {
  const steps = Math.round(angle / SNAP_INTERVAL);
  return steps * SNAP_INTERVAL;
};

interface SmallCubeData {
  basePos: THREE.Vector3;
  color: THREE.Color;
}

export function Cube({ interaction, setRotation, ambientColor }: CubeProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const snapState = useRef({
    isSnapping: false,
    startTime: 0,
    startX: 0,
    startY: 0,
    targetX: 0,
    targetY: 0,
  });

  const wasInteracting = useRef(false);

  const cubeData: SmallCubeData[] = useMemo(() => {
    const data: SmallCubeData[] = [];
    for (let z = -1; z <= 1; z++) {
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          const layerHue = (z + 1) * 30;
          const rowHue = (y + 1) * 10;
          const colHue = (x + 1) * 3.33;
          const hue = (0 + layerHue + rowHue + colHue) % 360;
          const color = hslToColor(hue, 80, 60);
          data.push({
            basePos: new THREE.Vector3(x, y, z),
            color,
          });
        }
      }
    }
    return data;
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    cubeData.forEach((cd, i) => {
      mesh.setColorAt(i, cd.color);
    });
    mesh.instanceColor!.needsUpdate = true;
  }, [cubeData]);

  // detect interaction end -> trigger snap
  useEffect(() => {
    if (wasInteracting.current && !interaction.isInteracting) {
      const targetX = snapToNearest(interaction.rotationX);
      const targetY = snapToNearest(interaction.rotationY);
      if (
        Math.abs(targetX - interaction.rotationX) > 0.001 ||
        Math.abs(targetY - interaction.rotationY) > 0.001
      ) {
        snapState.current = {
          isSnapping: true,
          startTime: performance.now() / 1000,
          startX: interaction.rotationX,
          startY: interaction.rotationY,
          targetX,
          targetY,
        };
      }
    }
    wasInteracting.current = interaction.isInteracting;
  }, [interaction.isInteracting, interaction.rotationX, interaction.rotationY]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;

    const time = clock.getElapsedTime();
    const breathePhase = (time * Math.PI * 2) / BREATHE_PERIOD;
    const currentGap = DEFAULT_GAP + GAP_AMPLITUDE * Math.sin(breathePhase);
    const spacing = CUBE_SIZE + currentGap;

    // snapping logic
    let rotX = interaction.rotationX;
    let rotY = interaction.rotationY;
    if (snapState.current.isSnapping) {
      const elapsed = time - snapState.current.startTime;
      const t = Math.min(1, elapsed / SNAP_DURATION);
      const eased = easeOut(t);
      rotX = snapState.current.startX + (snapState.current.targetX - snapState.current.startX) * eased;
      rotY = snapState.current.startY + (snapState.current.targetY - snapState.current.startY) * eased;
      if (t >= 1) {
        snapState.current.isSnapping = false;
        setRotation(snapState.current.targetX, snapState.current.targetY);
      } else {
        setRotation(rotX, rotY);
      }
    }

    group.rotation.x = rotX;
    group.rotation.y = rotY;

    // update instances
    for (let i = 0; i < 27; i++) {
      const cd = cubeData[i];
      dummy.position.set(
        cd.basePos.x * spacing,
        cd.basePos.y * spacing,
        cd.basePos.z * spacing
      );
      dummy.scale.setScalar(CUBE_SIZE);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Dynamic material color based on ambient light mixing
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissive) {
      mat.emissive.copy(ambientColor).multiplyScalar(0.15);
    }
  });

  // Compute responsive scale
  const responsiveScale = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    return window.innerWidth < 768 ? 0.6 : 1;
  }, []);

  return (
    <group ref={groupRef} scale={interaction.scale * responsiveScale}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, 27]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.35}
          metalness={0.15}
          vertexColors={false}
          emissive={new THREE.Color(0x000000)}
          emissiveIntensity={0.3}
        />
      </instancedMesh>
    </group>
  );
}
