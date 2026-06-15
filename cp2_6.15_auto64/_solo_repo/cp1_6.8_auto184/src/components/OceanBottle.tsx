import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Group, Vector3 } from 'three';
import { BottleData, EMOTION_CONFIG } from '../BottleData';
import { useOceanStore } from '../store';

interface OceanBottleProps {
  bottle: BottleData;
}

export default function OceanBottle({ bottle }: OceanBottleProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const capRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const isDragging = useRef(false);

  const { camera, gl } = useThree();
  const startDrag = useOceanStore((s) => s.startDrag);
  const endDrag = useOceanStore((s) => s.endDrag);
  const analyzeBottle = useOceanStore((s) => s.analyzeBottle);
  const updateBottlePosition = useOceanStore((s) => s.updateBottlePosition);
  const draggedBottleId = useOceanStore((s) => s.draggedBottleId);
  const selectedBottleId = useOceanStore((s) => s.selectedBottleId);

  const config = EMOTION_CONFIG[bottle.emotion];
  const [baseX, baseY, baseZ] = bottle.position;
  const isSelected = selectedBottleId === bottle.id;
  const isBeingDragged = draggedBottleId === bottle.id;

  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (!isDragging.current) {
        isDragging.current = true;
        startDrag(bottle.id);
      }
    },
    [bottle.id, startDrag],
  );

  useEffect(() => {
    if (!isBeingDragged) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const dir = new Vector3(x, y, 0.5).unproject(camera);
      const origin = camera.position.clone();
      dir.sub(origin).normalize();

      const t = (0.15 - origin.y) / dir.y;
      const hitX = origin.x + dir.x * t;
      const hitZ = origin.z + dir.z * t;

      updateBottlePosition(bottle.id, [hitX, 0.15, hitZ]);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      endDrag();

      const currentBottle = useOceanStore.getState().bottles.find((b) => b.id === bottle.id);
      if (currentBottle && currentBottle.position[0] < -4) {
        analyzeBottle(bottle.id);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('pointerup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerup', onMouseUp);
    };
  }, [isBeingDragged, bottle.id, camera, gl, endDrag, analyzeBottle, updateBottlePosition]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    if (!isBeingDragged) {
      groupRef.current.position.x = baseX;
      groupRef.current.position.y = baseY + Math.sin(time * 0.8 + baseX * 0.5) * 0.08;
      groupRef.current.position.z = baseZ;
    } else {
      groupRef.current.position.y = 0.15 + Math.sin(time * 0.8 + baseX * 0.5) * 0.04;
    }

    groupRef.current.rotation.y += 0.002;
  });

  return (
    <group ref={groupRef} position={[baseX, baseY, baseZ]}>
      <mesh ref={bodyRef} onPointerDown={handlePointerDown}>
        <cylinderGeometry args={[0.12, 0.15, 0.5, 16]} />
        <meshPhysicalMaterial
          color={config.color}
          transmission={0.3}
          roughness={0.1}
          metalness={0.1}
          emissive={config.color}
          emissiveIntensity={0.15}
          transparent
          opacity={0.85}
        />
      </mesh>

      <mesh ref={capRef} position={[0, 0.3, 0]} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshPhysicalMaterial
          color={config.color}
          transmission={0.3}
          roughness={0.1}
          metalness={0.1}
          emissive={config.color}
          emissiveIntensity={0.15}
          transparent
          opacity={0.85}
        />
      </mesh>

      <pointLight color={config.color} intensity={0.5} distance={3} />

      {isSelected && (
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
          <ringGeometry args={[0.2, 0.35, 32]} />
          <meshBasicMaterial
            color={config.color}
            emissive={config.color}
            emissiveIntensity={0.6}
            transparent
            opacity={0.5}
            side={2}
          />
        </mesh>
      )}
    </group>
  );
}
