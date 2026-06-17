import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePipelineStore } from '@/store/pipelineStore';
import type { Pipeline, Point3D, PipelineSegment } from '@/store/types';
import { PIPELINE_CONFIGS, SAFE_DISTANCE } from '@/store/types';
import { segmentToAllPipelinesMinDistance } from './collisionDetector';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function GroundBlock() {
  return (
    <group position={[0, -5, 0]}>
      <mesh>
        <boxGeometry args={[20, 10, 15]} />
        <meshStandardMaterial
          color="#2a2a4a"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(20, 10, 15)]} />
        <lineBasicMaterial color="#606060" transparent opacity={0.2} />
      </lineSegments>
      <gridHelper args={[20, 40, '#606060', '#606060']} position={[0, 5, 0]}>
        <lineBasicMaterial transparent opacity={0.2} attach="material" />
      </gridHelper>
      <gridHelper args={[15, 30, '#606060', '#606060']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 7.5]}>
        <lineBasicMaterial transparent opacity={0.15} attach="material" />
      </gridHelper>
      <gridHelper args={[15, 30, '#606060', '#606060']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -7.5]}>
        <lineBasicMaterial transparent opacity={0.15} attach="material" />
      </gridHelper>
      <gridHelper args={[20, 40, '#606060', '#606060']} rotation={[0, 0, Math.PI / 2]} position={[10, 0, 0]}>
        <lineBasicMaterial transparent opacity={0.15} attach="material" />
      </gridHelper>
      <gridHelper args={[20, 40, '#606060', '#606060']} rotation={[0, 0, Math.PI / 2]} position={[-10, 0, 0]}>
        <lineBasicMaterial transparent opacity={0.15} attach="material" />
      </gridHelper>
    </group>
  );
}

function CylinderBetweenPoints({
  start,
  end,
  radius,
  color,
  selected = false,
  opacity = 1,
  emissiveIntensity = 0,
}: {
  start: Point3D;
  end: Point3D;
  radius: number;
  color: string;
  selected?: boolean;
  opacity?: number;
  emissiveIntensity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const direction = useMemo(() => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    return { dx, dy, dz, len: Math.sqrt(dx * dx + dy * dy + dz * dz) };
  }, [start, end]);

  useFrame(() => {
    if (!ref.current || direction.len <= 0) return;
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      (start.z + end.z) / 2
    );
    ref.current.position.copy(mid);
    const dirVec = new THREE.Vector3(direction.dx, direction.dy, direction.dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dirVec);
    ref.current.quaternion.copy(quat);
  });

  const finalColor = selected
    ? new THREE.Color(color).offsetHSL(0, 0.2, 0.1).getStyle()
    : color;

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[radius, radius, Math.max(direction.len, 0.001), 16]} />
      <meshStandardMaterial
        color={finalColor}
        emissive={selected ? color : '#000000'}
        emissiveIntensity={selected ? 0.5 + emissiveIntensity : emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
        metalness={0.3}
        roughness={0.5}
      />
    </mesh>
  );
}

function PipelineMesh({
  pipeline,
  selected,
  onSelect,
}: {
  pipeline: Pipeline;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const config = PIPELINE_CONFIGS[pipeline.type];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect(pipeline.id);
      }}
    >
      {pipeline.segments.map((seg) => (
        <CylinderBetweenPoints
          key={seg.id}
          start={seg.start}
          end={seg.end}
          radius={config.radius}
          color={config.color}
          selected={selected}
          opacity={visible ? 1 : 0}
        />
      ))}
      {pipeline.nodes.map((node, idx) => (
        <mesh key={`n_${pipeline.id}_${idx}`} position={[node.x, node.y, node.z]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={config.color}
            emissive={selected ? config.color : '#000000'}
            emissiveIntensity={selected ? 0.6 : 0}
            transparent
            opacity={visible ? 1 : 0}
          />
        </mesh>
      ))}
      {selected && <ProfileLine pipeline={pipeline} />}
    </group>
  );
}

function ProfileLine({ pipeline }: { pipeline: Pipeline }) {
  const points = useMemo(() => {
    const result: THREE.Vector3[] = [];
    const allPoints: Point3D[] = [];
    for (const seg of pipeline.segments) {
      if (allPoints.length === 0) allPoints.push(seg.start);
      allPoints.push(seg.end);
    }
    for (let i = 0; i < allPoints.length; i++) {
      const p = allPoints[i];
      result.push(new THREE.Vector3(p.x, p.y - 0.01, p.z));
      result.push(new THREE.Vector3(p.x, p.y - 0.5, p.z));
    }
    return result;
  }, [pipeline]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.9} linewidth={2} />
    </lineSegments>
  );
}

function CollisionMarkers() {
  const collisions = usePipelineStore((s) => s.collisions);
  const hovered = usePipelineStore((s) => s.hoveredCollisionId);
  const ref = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    collisions.forEach((c, i) => {
      if (ref.current[i]) {
        const base = c.id === hovered ? 0.9 : 0.4;
        const pulse = c.id === hovered ? 0.1 + Math.sin(t * 8) * 0.3 : 0;
        ref.current[i].scale.setScalar(1 + pulse);
        const mat = ref.current[i].material as THREE.MeshStandardMaterial;
        mat.opacity = base + pulse;
      }
    });
  });

  return (
    <group>
      {collisions.map((c, idx) => (
        <mesh
          key={c.id}
          ref={(el) => {
            if (el) ref.current[idx] = el;
          }}
          position={[c.position.x, c.position.y, c.position.z]}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#FF5252"
            emissive="#FF5252"
            emissiveIntensity={c.id === hovered ? 1.2 : 0.6}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function DrawingPreview() {
  const start = usePipelineStore((s) => s.drawingStart);
  const preview = usePipelineStore((s) => s.drawingPreview);
  const warning = usePipelineStore((s) => s.drawingWarning);
  const dist = usePipelineStore((s) => s.drawingDistance);
  const activeType = usePipelineStore((s) => s.activePipelineType);
  const config = PIPELINE_CONFIGS[activeType];

  const flashRef = useRef<THREE.Material>(null);
  useFrame((state) => {
    if (flashRef.current && warning) {
      const t = state.clock.elapsedTime;
      const mat = flashRef.current as THREE.MeshStandardMaterial;
      mat.opacity = 0.5 + Math.sin(t * 25) * 0.3;
    }
  });

  if (!start || !preview) return null;

  const color = warning ? '#FF0000' : config.color;
  const mid: Point3D = {
    x: (start.x + preview.x) / 2,
    y: (start.y + preview.y) / 2 + 0.5,
    z: (start.z + preview.z) / 2,
  };

  return (
    <group>
      <CylinderBetweenPoints
        start={start}
        end={preview}
        radius={config.radius}
        color={color}
        opacity={warning ? 0.9 : 0.6}
        emissiveIntensity={warning ? 0.8 : 0.2}
      />
      <mesh position={[start.x, start.y, start.z]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.8}
          ref={flashRef as any}
        />
      </mesh>
      <Html position={[mid.x, mid.y, mid.z]} center distanceFactor={10}>
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: warning ? '#FF0000' : '#ffffff',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            border: warning ? '1px solid #FF0000' : '1px solid #555',
          }}
        >
          距离: {dist.toFixed(2)}
          {warning && ' ⚠ 碰撞风险'}
        </div>
      </Html>
    </group>
  );
}

function DrawingHandler() {
  const { raycaster, camera, scene } = useThree();
  const controlsRef = useRef<any>(null);
  const isDrawing = usePipelineStore((s) => s.isDrawing);
  const startDrawing = usePipelineStore((s) => s.startDrawing);
  const updateDrawingPreview = usePipelineStore((s) => s.updateDrawingPreview);
  const finishDrawing = usePipelineStore((s) => s.finishDrawing);
  const cancelDrawing = usePipelineStore((s) => s.cancelDrawing);
  const pipelines = usePipelineStore((s) => s.pipelines);
  const activeType = usePipelineStore((s) => s.activePipelineType);
  const selectPipeline = usePipelineStore((s) => s.selectPipeline);

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 1));

  const getGroundPoint = (e: any): Point3D | null => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(planeRef.current, intersection);
    if (!hit) return null;
    return {
      x: clamp(intersection.x, -9.9, 9.9),
      y: clamp(-intersection.y, -2.0, -0.2),
      z: clamp(intersection.z, -7.4, 7.4),
    };
  };

  const handlePointerDown = (e: any) => {
    if (e.button === 2) return;
    if (e.button === 0 && e.altKey) return;

    const hitPoint = getGroundPoint(e);
    if (!hitPoint) return;

    const config = PIPELINE_CONFIGS[activeType];
    const hit = raycaster.intersectObjects(scene.children, true);
    let hitPipelineId: string | null = null;
    for (const h of hit) {
      let obj: any = h.object;
      while (obj && !hitPipelineId) {
        if (obj.userData?.pipelineId) {
          hitPipelineId = obj.userData.pipelineId;
        }
        obj = obj.parent;
      }
    }

    if (!isDrawing) {
      if (hitPipelineId) {
        selectPipeline(hitPipelineId);
      } else {
        startDrawing(hitPoint);
      }
    } else {
      finishDrawing(hitPoint);
    }
    void config;
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing) return;
    const point = getGroundPoint(e);
    if (!point) return;

    const start = usePipelineStore.getState().drawingStart;
    if (!start) return;

    const minDist = segmentToAllPipelinesMinDistance(start, point, pipelines);
    const warning = minDist < SAFE_DISTANCE;
    updateDrawingPreview(point, minDist, warning);
  };

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    if (isDrawing) {
      cancelDrawing();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        cancelDrawing();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDrawing, cancelDrawing]);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('pointerdown', handlePointerDown as any);
      canvas.addEventListener('pointermove', handlePointerMove as any);
      canvas.addEventListener('contextmenu', handleContextMenu as any);
      return () => {
        canvas.removeEventListener('pointerdown', handlePointerDown as any);
        canvas.removeEventListener('pointermove', handlePointerMove as any);
        canvas.removeEventListener('contextmenu', handleContextMenu as any);
      };
    }
  }, [isDrawing, pipelines]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      mouseButtons={{
        LEFT: isDrawing ? undefined : (undefined as any),
        MIDDLE: undefined as any,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}

function SceneContent() {
  const pipelines = usePipelineStore((s) => s.pipelines);
  const selectedId = usePipelineStore((s) => s.selectedPipelineId);
  const selectPipeline = usePipelineStore((s) => s.selectPipeline);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-10, 5, -10]} intensity={0.3} />

      <GroundBlock />

      {pipelines.map((p) => (
        <PipelineMesh
          key={p.id}
          pipeline={p}
          selected={p.id === selectedId}
          onSelect={selectPipeline}
        />
      ))}

      <CollisionMarkers />
      <DrawingPreview />
      <DrawingHandler />
    </>
  );
}

export function PipelineScene() {
  return (
    <Canvas
      camera={{ position: [18, 16, 20], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: '#1E1E2E', width: '100%', height: '100%' }}
      onPointerMissed={() => usePipelineStore.getState().selectPipeline(null)}
    >
      <SceneContent />
    </Canvas>
  );
}
