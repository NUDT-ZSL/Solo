import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePipelineStore } from '@/store/pipelineStore';
import type { Pipeline, Point3D } from '@/data/types';
import { PIPELINE_CONFIGS, SAFE_DISTANCE } from '@/data/types';
import { segmentToAllPipelinesMinSurfaceDistance } from './collisionDetector';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const FADE_DURATION = 0.5;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
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

  const baseColor = new THREE.Color(color);
  const finalColor = selected
    ? new THREE.Color(color).offsetHSL(0, 0.2, 0.1).getStyle()
    : color;
  const emissiveColor = selected ? baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.3) : baseColor;
  void emissiveColor;

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
        depthWrite={opacity >= 1}
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
  const groupRef = useRef<THREE.Group>(null);
  const [fadeProgress, setFadeProgress] = useState(0);

  const startTime = useMemo(() => pipeline.createdAt ?? Date.now(), [pipeline.id]);

  useFrame(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min(1, elapsed / FADE_DURATION);
    const eased = easeOutCubic(progress);
    setFadeProgress(eased);

    if (groupRef.current) {
      groupRef.current.userData.pipelineId = pipeline.id;
      groupRef.current.traverse((child) => {
        (child as any).userData.pipelineId = pipeline.id;
      });
    }
  });

  const opacity = fadeProgress;

  return (
    <group
      ref={groupRef}
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
          opacity={opacity}
        />
      ))}
      {pipeline.nodes.map((node, idx) => (
        <mesh
          key={`n_${pipeline.id}_${idx}`}
          position={[node.x, node.y, node.z]}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={config.color}
            emissive={selected ? config.color : '#000000'}
            emissiveIntensity={selected ? 0.6 : 0}
            transparent
            opacity={opacity}
            depthWrite={opacity >= 1}
          />
        </mesh>
      ))}
      {selected && opacity >= 0.9 && <ProfileLine pipeline={pipeline} />}
    </group>
  );
}

function ProfileLine({ pipeline }: { pipeline: Pipeline }) {
  const { linePoints, labelPositions } = useMemo(() => {
    const allNodes: Point3D[] = [];
    for (const seg of pipeline.segments) {
      if (allNodes.length === 0) allNodes.push(seg.start);
      const last = allNodes[allNodes.length - 1];
      if (last.x !== seg.end.x || last.y !== seg.end.y || last.z !== seg.end.z) {
        allNodes.push(seg.end);
      }
    }

    const profileDrop = 0.8;
    const linePts: THREE.Vector3[] = [];
    const labels: { pos: Point3D; depth: number }[] = [];

    for (let i = 0; i < allNodes.length; i++) {
      const p = allNodes[i];
      linePts.push(new THREE.Vector3(p.x, p.y - 0.02, p.z));
      linePts.push(new THREE.Vector3(p.x, p.y - profileDrop, p.z));
      labels.push({
        pos: { x: p.x, y: p.y - profileDrop - 0.15, z: p.z },
        depth: p.y,
      });
    }

    return { linePoints: linePts, labelPositions: labels };
  }, [pipeline]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </lineSegments>
      {labelPositions.map((label, i) => (
        <Html
          key={`lbl_${pipeline.id}_${i}`}
          position={[label.pos.x, label.pos.y, label.pos.z]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(45, 45, 68, 0.95)',
              color: '#7DD3FC',
              padding: '2px 6px',
              borderRadius: 3,
              fontSize: 10,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              border: '0.5px solid #7DD3FC55',
              lineHeight: 1.2,
            }}
          >
            深度 {label.depth.toFixed(2)}m
          </div>
        </Html>
      ))}
    </group>
  );
}

function CollisionMarkers() {
  const collisions = usePipelineStore((s) => s.collisions);
  const hovered = usePipelineStore((s) => s.hoveredCollisionId);
  const refs = useRef<Map<string, THREE.Mesh>>(new Map());

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    collisions.forEach((c) => {
      const mesh = refs.current.get(c.id);
      if (!mesh) return;

      const isHovered = c.id === hovered;

      if (isHovered) {
        const cycle = (t % 0.5) / 0.5;
        const pulse = Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5;
        const scale = 1 + pulse * 0.6;
        mesh.scale.setScalar(scale);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.5 + pulse * 0.5;
        mat.emissiveIntensity = 0.8 + pulse * 1.2;
        mat.color.set('#FF5252');
        mat.emissive.set('#FF5252');
      } else if (!c.resolved) {
        const base = 0.4 + Math.sin(t * 2 + collisions.indexOf(c)) * 0.1;
        mesh.scale.setScalar(1);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = base;
        mat.emissiveIntensity = 0.6;
      } else {
        mesh.scale.setScalar(0.8);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.3;
        mat.emissiveIntensity = 0.2;
        mat.color.set('#4CAF50');
        mat.emissive.set('#4CAF50');
      }
    });
  });

  return (
    <group>
      {collisions.map((c) => (
        <mesh
          key={c.id}
          ref={(el) => {
            if (el) refs.current.set(c.id, el);
          }}
          position={[c.position.x, c.position.y, c.position.z]}
        >
          <sphereGeometry args={[0.2, 20, 20]} />
          <meshStandardMaterial
            color="#FF5252"
            emissive="#FF5252"
            emissiveIntensity={0.6}
            transparent
            opacity={0.4}
            depthWrite={false}
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

  const previewRef = useRef<THREE.Mesh>(null);
  const startNodeRef = useRef<THREE.Material>(null);
  const warningStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (warning) {
      warningStartTime.current = performance.now();
    } else {
      warningStartTime.current = null;
    }
  }, [warning]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (startNodeRef.current) {
      const mat = startNodeRef.current as THREE.MeshStandardMaterial;
      if (warning) {
        const elapsed = warningStartTime.current
          ? (performance.now() - warningStartTime.current) / 1000
          : 0;
        const flash = Math.sin(t * Math.PI * 10);
        mat.opacity = 0.5 + Math.abs(flash) * 0.5;
        mat.emissiveIntensity = 0.6 + Math.abs(flash) * 0.8;
        void elapsed;
      } else {
        mat.opacity = 0.85;
        mat.emissiveIntensity = 0.5;
      }
    }

    if (previewRef.current && warning) {
      const flash = (Math.sin(t * Math.PI * 10) + 1) / 2;
      const mat = (previewRef.current as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + flash * 0.9;
    }
  });

  if (!start || !preview) return null;

  const color = warning ? '#FF0000' : config.color;
  const labelOffsetY = 1.0;
  const avgY = (start.y + preview.y) / 2;
  const mid: Point3D = {
    x: (start.x + preview.x) / 2,
    y: Math.max(start.y, preview.y) + labelOffsetY,
    z: (start.z + preview.z) / 2,
  };

  return (
    <group>
      <CylinderBetweenPoints
        start={start}
        end={preview}
        radius={config.radius}
        color={color}
        opacity={warning ? 0.95 : 0.55}
        emissiveIntensity={warning ? 0.6 : 0.15}
      />
      <mesh ref={previewRef as any} position={[preview.x, preview.y, preview.z]}>
        <sphereGeometry args={[config.radius * 1.4, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[start.x, start.y, start.z]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.85}
          ref={startNodeRef as any}
        />
      </mesh>
      <Html position={[mid.x, mid.y, mid.z]} center distanceFactor={10}>
        <div
          style={{
            background: warning ? 'rgba(255,0,0,0.92)' : 'rgba(15,15,30,0.92)',
            color: warning ? '#fff' : '#ffffff',
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            whiteSpace: 'nowrap',
            border: warning ? '1px solid #FF6B6B' : '1px solid #555577aa',
            boxShadow: warning
              ? '0 0 12px rgba(255,0,0,0.5)'
              : '0 2px 12px rgba(0,0,0,0.4)',
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          <span style={{ marginRight: 6 }}>距离:</span>
          <span style={{ color: warning ? '#FFE5E5' : '#7DD3FC', fontSize: 13 }}>
            {dist.toFixed(2)}
          </span>
          {warning && (
            <span style={{ marginLeft: 8, color: '#FFE5E5' }}>
              ⚠ 碰撞风险
            </span>
          )}
        </div>
      </Html>
      <Html
        position={[start.x, start.y - 0.6, start.z]}
        center
        distanceFactor={10}
      >
        <div
          style={{
            background: 'rgba(15,15,30,0.8)',
            color: '#aaaacc',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontFamily: 'monospace',
            border: '0.5px solid #555577',
          }}
        >
          起点 [{start.x.toFixed(1)}, {start.z.toFixed(1)}]
        </div>
      </Html>
    </group>
  );
}

function DrawingHandler() {
  const { raycaster, camera, scene } = useThree();
  const isDrawing = usePipelineStore((s) => s.isDrawing);
  const startDrawing = usePipelineStore((s) => s.startDrawing);
  const updateDrawingPreview = usePipelineStore((s) => s.updateDrawingPreview);
  const finishDrawing = usePipelineStore((s) => s.finishDrawing);
  const cancelDrawing = usePipelineStore((s) => s.cancelDrawing);
  const pipelines = usePipelineStore((s) => s.pipelines);
  const activeType = usePipelineStore((s) => s.activePipelineType);
  const selectPipeline = usePipelineStore((s) => s.selectPipeline);

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.0));
  const isDragging = useRef(false);
  const lastPreviewPoint = useRef<Point3D | null>(null);
  const UPDATE_THRESHOLD = 0.01;

  const getGroundPoint = (e: PointerEvent): Point3D | null => {
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
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

  const findHitPipelineId = (): string | null => {
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      let obj: any = h.object;
      while (obj) {
        if (obj.userData?.pipelineId) {
          return obj.userData.pipelineId as string;
        }
        obj = obj.parent;
      }
    }
    return null;
  };

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 2) return;

      const hitPoint = getGroundPoint(e);
      if (!hitPoint) return;

      if (!isDrawing) {
        const hitPipelineId = findHitPipelineId();
        if (hitPipelineId) {
          selectPipeline(hitPipelineId);
          return;
        }
        selectPipeline(null);
        isDragging.current = true;
        startDrawing(hitPoint);
        lastPreviewPoint.current = hitPoint;
      } else {
        isDragging.current = false;
        finishDrawing(hitPoint);
        lastPreviewPoint.current = null;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawing && !isDragging.current) return;
      const point = getGroundPoint(e);
      if (!point) return;

      if (lastPreviewPoint.current) {
        const d = Math.sqrt(
          Math.pow(point.x - lastPreviewPoint.current.x, 2) +
          Math.pow(point.z - lastPreviewPoint.current.z, 2)
        );
        if (d < UPDATE_THRESHOLD) return;
      }
      lastPreviewPoint.current = point;

      const start = usePipelineStore.getState().drawingStart;
      if (!start) return;

      const currentRadius = PIPELINE_CONFIGS[activeType].radius;
      const { minCenterDist } = segmentToAllPipelinesMinSurfaceDistance(
        start,
        point,
        currentRadius,
        pipelines
      );
      const warning = minCenterDist < SAFE_DISTANCE + currentRadius;
      updateDrawingPreview(point, minCenterDist, warning);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDragging.current && isDrawing) {
        const hitPoint = getGroundPoint(e);
        if (hitPoint) {
          isDragging.current = false;
          finishDrawing(hitPoint);
        }
      }
      isDragging.current = false;
      lastPreviewPoint.current = null;
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      if (isDrawing || isDragging.current) {
        isDragging.current = false;
        cancelDrawing();
        lastPreviewPoint.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isDrawing || isDragging.current)) {
        isDragging.current = false;
        cancelDrawing();
        lastPreviewPoint.current = null;
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawing, pipelines, activeType]);

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      mouseButtons={{
        LEFT: undefined as any,
        MIDDLE: undefined as any,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE: undefined as any,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      minDistance={6}
      maxDistance={60}
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
      <color attach="background" args={['#1E1E2E']} />
      <fog attach="fog" args={['#1E1E2E', 40, 80]} />

      <ambientLight intensity={0.55} color="#e8eaff" />
      <directionalLight
        position={[15, 22, 12]}
        intensity={1.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-12, 8, -10]} intensity={0.25} color="#8888ff" />
      <hemisphereLight args={['#b0b0ff', '#2a2a4a', 0.3]} />

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
      camera={{ position: [20, 18, 22], fov: 48, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{ background: '#1E1E2E', width: '100%', height: '100%' }}
      onPointerMissed={() => usePipelineStore.getState().selectPipeline(null)}
      frameloop="always"
    >
      <SceneContent />
    </Canvas>
  );
}
