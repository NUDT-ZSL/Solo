import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, STRATUM } from '../../store';

interface CuttingPlaneProps {
  axis: 'x' | 'z';
  initialPosition: number;
  onActivate: () => void;
}

function CuttingPlane({ axis, initialPosition, onActivate }: CuttingPlaneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planeMeshRef = useRef<THREE.Mesh>(null);
  const handleRef = useRef<THREE.Mesh>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl, scene } = useThree();
  const setCutX = useStore((s) => s.setCutX);
  const setCutZ = useStore((s) => s.setCutZ);

  const halfW = STRATUM.width / 2;
  const halfD = STRATUM.depth / 2;
  const minLimit = axis === 'x' ? -halfW : -halfD;
  const maxLimit = axis === 'x' ? halfW : halfD;

  useEffect(() => {
    const clamped = Math.max(minLimit, Math.min(maxLimit, position));
    if (axis === 'x') setCutX(clamped);
    else setCutZ(clamped);
    if (groupRef.current) {
      groupRef.current.position[axis] = clamped;
    }
  }, [position, axis, minLimit, maxLimit, setCutX, setCutZ]);

  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      onActivate();
    },
    [onActivate]
  );

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragPlane = useMemo(() => {
    const normal = axis === 'x' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    return new THREE.Plane(normal, 0);
  }, [axis]);

  useEffect(() => {
    if (!isDragging) return;

    const canvas = gl.domElement;
    const mouse = new THREE.Vector2();
    const intersectPoint = new THREE.Vector3();

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(dragPlane, intersectPoint);

      const newValue = axis === 'x' ? intersectPoint.x : intersectPoint.z;
      const clamped = Math.max(minLimit, Math.min(maxLimit, newValue));
      setPosition(clamped);
    };

    const onPointerUp = () => {
      setIsDragging(false);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, axis, minLimit, maxLimit, camera, gl, raycaster, dragPlane]);

  useFrame(() => {
    if (handleRef.current) {
      const scale = isDragging ? 1.2 : 1.0;
      handleRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.15);
    }
  });

  const planeSize = axis === 'x' ? [2, STRATUM.height] : [STRATUM.width, STRATUM.height];
  const planeRot: [number, number, number] = axis === 'x' ? [0, 0, 0] : [0, Math.PI / 2, 0];
  const handleSize = 6;
  const handlePos: [number, number, number] = axis === 'x'
    ? [0, STRATUM.yTop + 5, 0]
    : [0, STRATUM.yTop + 5, 0];

  return (
    <group ref={groupRef} position={[axis === 'x' ? position : 0, 0, axis === 'z' ? position : 0]}>
      <mesh
        ref={planeMeshRef}
        rotation={planeRot}
        position={[0, (STRATUM.yTop + STRATUM.yBottom) / 2, 0]}
        onPointerDown={handlePointerDown}
      >
        <planeGeometry args={planeSize as [number, number]} />
        <meshBasicMaterial
          color="#ff5252"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <gridHelper
        args={[
          axis === 'x' ? STRATUM.depth : STRATUM.width,
          20,
          '#ef5350',
          '#ef5350',
        ]}
        position={[0, (STRATUM.yTop + STRATUM.yBottom) / 2, 0]}
        rotation={axis === 'x' ? [Math.PI / 2, 0, 0] : [Math.PI / 2, Math.PI / 2, 0]}
      >
        <meshBasicMaterial transparent opacity={0.5} side={THREE.DoubleSide} />
      </gridHelper>

      <mesh
        ref={handleRef}
        position={handlePos}
        onPointerDown={handlePointerDown}
      >
        <sphereGeometry args={[handleSize / 2, 16, 16]} />
        <meshStandardMaterial
          color={isDragging ? '#ff1744' : '#ff5252'}
          emissive="#ff5252"
          emissiveIntensity={isDragging ? 0.5 : 0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

export default function CuttingPlanesManager() {
  const { cutX, cutZ, setCutX, setCutZ } = useStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setCutX(0);
      setCutZ(0);
      setInitialized(true);
    }
  }, [initialized, setCutX, setCutZ]);

  const [activePlane, setActivePlane] = useState<'x' | 'z' | null>(null);

  const activate = useCallback((axis: 'x' | 'z') => setActivePlane(axis), []);

  if (!initialized) return null;

  return (
    <group>
      {cutX !== null && (
        <CuttingPlane
          key="cut-x"
          axis="x"
          initialPosition={cutX}
          onActivate={() => activate('x')}
        />
      )}
      {cutZ !== null && (
        <CuttingPlane
          key="cut-z"
          axis="z"
          initialPosition={cutZ}
          onActivate={() => activate('z')}
        />
      )}
    </group>
  );
}
