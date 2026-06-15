import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { VortexSystem, VortexRing, MergeEffect, ClickRippleEffect } from './VortexSystem';

interface DragState {
  isDragging: boolean;
  startPoint: THREE.Vector3 | null;
  endPoint: THREE.Vector3 | null;
  startScreen: { x: number; y: number };
  endScreen: { x: number; y: number };
  startTime: number;
}

interface HoverInfo {
  ring: VortexRing;
  screenPos: { x: number; y: number };
}

interface SceneEventHandlers {
  onPointerDown: (e: any) => void;
  onPointerMove: (e: any) => void;
  onPointerUp: (e: any) => void;
}

const PLANE_Y = 0;
const MAX_PARTICLES = 15000;

function createCircleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function GroundGrid() {
  return (
    <Grid
      position={[0, PLANE_Y - 0.01, 0]}
      args={[50, 50]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="rgba(42,42,110,0.15)"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="rgba(58,58,142,0.15)"
      fadeDistance={30}
      fadeStrength={1}
      infiniteGrid
    />
  );
}

function BackgroundGradient() {
  const { scene } = useThree();
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(1, 1, 0, 1, 1, 2);
    gradient.addColorStop(0, '#0A0A2E');
    gradient.addColorStop(1, '#1A0B2E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 2);
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    return () => {
      texture.dispose();
    };
  }, [scene]);
  return null;
}

interface ParticleSystemProps {
  vortexSystem: VortexSystem;
  hoveredRingId: number | null;
}

function ParticleSystem({ vortexSystem, hoveredRingId }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: createCircleTexture() },
        uSizeScale: { value: window.devicePixelRatio * 0.8 },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uSizeScale;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uSizeScale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.1) discard;
          gl_FragColor = vec4(vColor, vOpacity * texColor.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }, []);

  useFrame(() => {
    if (!geometryRef.current || !pointsRef.current) return;
    const data = vortexSystem.getParticleData();
    const count = data.totalCount;

    const posAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = geometryRef.current.getAttribute('size') as THREE.BufferAttribute;
    const opAttr = geometryRef.current.getAttribute('opacity') as THREE.BufferAttribute;

    (posAttr.array as Float32Array).set(data.positions.subarray(0, count * 3));
    (colAttr.array as Float32Array).set(data.colors.subarray(0, count * 3));
    (sizeAttr.array as Float32Array).set(data.sizes.subarray(0, count));
    (opAttr.array as Float32Array).set(data.opacities.subarray(0, count));

    if (hoveredRingId !== null) {
      const ring = vortexSystem.getVortexRings().find((r) => r.id === hoveredRingId);
      if (ring) {
        for (let i = 0; i < ring.particleCount; i++) {
          const idx = (ring.particlesOffset + i) * 3;
          (colAttr.array as Float32Array)[idx] = Math.min(1, (colAttr.array as Float32Array)[idx] * 1.1);
          (colAttr.array as Float32Array)[idx + 1] = Math.min(1, (colAttr.array as Float32Array)[idx + 1] * 1.1);
          (colAttr.array as Float32Array)[idx + 2] = Math.min(1, (colAttr.array as Float32Array)[idx + 2] * 1.1);
        }
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    opAttr.needsUpdate = true;

    geometryRef.current.setDrawRange(0, count);
    geometryRef.current.computeBoundingSphere();
  });

  return (
    <points ref={pointsRef} frustumCulled={false} material={material}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(MAX_PARTICLES * 3), 3]}
          count={MAX_PARTICLES}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[new Float32Array(MAX_PARTICLES * 3), 3]}
          count={MAX_PARTICLES}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[new Float32Array(MAX_PARTICLES), 1]}
          count={MAX_PARTICLES}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-opacity"
          args={[new Float32Array(MAX_PARTICLES), 1]}
          count={MAX_PARTICLES}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
    </points>
  );
}

interface MergeEffectMeshProps {
  effect: MergeEffect;
}

function MergeEffectMesh({ effect }: MergeEffectMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (meshRef.current && materialRef.current) {
      const scale = effect.currentRadius;
      meshRef.current.scale.setScalar(scale);
      materialRef.current.opacity = effect.opacity;
    }
  });

  return (
    <mesh ref={meshRef} position={effect.center.toArray()}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial ref={materialRef} color="#00D4FF" transparent opacity={0.8} wireframe depthWrite={false} />
    </mesh>
  );
}

interface ClickRippleMeshProps {
  effect: ClickRippleEffect;
}

function ClickRippleMesh({ effect }: ClickRippleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (meshRef.current && materialRef.current) {
      const t = Math.min(1, (performance.now() - effect.startTime) / effect.duration);
      const scale = t * 5;
      meshRef.current.scale.setScalar(scale);
      materialRef.current.opacity = 0.8 * (1 - t);
    }
  });

  return (
    <mesh ref={meshRef} position={effect.center.toArray()} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial ref={materialRef} color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

interface SceneEventHandlerProps {
  vortexSystem: VortexSystem;
  dragRef: React.MutableRefObject<DragState | null>;
  setHoveredRingId: (id: number | null) => void;
  setHoverInfo: (info: HoverInfo | null) => void;
  setMergeEffectsKey: (n: number) => void;
  mergeEffectsKey: number;
  shiftPressedRef: React.MutableRefObject<boolean>;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  onSetDrag: (drag: DragState | null) => void;
}

function SceneEventHandler({
  vortexSystem,
  dragRef,
  setHoveredRingId,
  setHoverInfo,
  setMergeEffectsKey,
  mergeEffectsKey,
  shiftPressedRef,
  canvasContainerRef,
  onSetDrag,
}: SceneEventHandlerProps) {
  const { camera, gl, scene } = useThree();

  const unprojectPoint = useCallback((clientX: number, clientY: number): THREE.Vector3 => {
    const rect = canvasContainerRef.current!.getBoundingClientRect();
    if (!rect) return new THREE.Vector3();
    const ndc = new THREE.Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
      0.5
    );
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    const t = (PLANE_Y - camera.position.y) / dir.y;
    if (t > 0) {
      return camera.position.clone().addScaledVector(dir, t);
    }
    const t2 = (2 - camera.position.y) / dir.y;
    return camera.position.clone().addScaledVector(dir, Math.max(t2, 5));
  }, [camera, canvasContainerRef]);

  useFrame((_, delta) => {
    vortexSystem.update(delta);
    if (vortexSystem.getMergeEffects().length > 0 || vortexSystem.getClickRippleEffects().length > 0) {
      setMergeEffectsKey(mergeEffectsKey + 1);
    }
  });

  const handlePointerDown = useCallback(
    (event: any) => {
      event.stopPropagation();
      const nativeEvent = event.nativeEvent || event;
      const clientX = nativeEvent.clientX ?? 0;
      const clientY = nativeEvent.clientY ?? 0;
      const worldPos = unprojectPoint(clientX, clientY);
      const newDrag: DragState = {
        isDragging: true,
        startPoint: worldPos,
        endPoint: worldPos,
        startScreen: { x: clientX, y: clientY },
        endScreen: { x: clientX, y: clientY },
        startTime: performance.now(),
      };
      dragRef.current = newDrag;
      onSetDrag(newDrag);
    },
    [unprojectPoint, dragRef, onSetDrag]
  );

  const handlePointerMove = useCallback(
    (event: any) => {
      event.stopPropagation();
      const nativeEvent = event.nativeEvent || event;
      const clientX = nativeEvent.clientX ?? 0;
      const clientY = nativeEvent.clientY ?? 0;

      const drag = dragRef.current;

      if (drag && drag.isDragging) {
        const worldPos = unprojectPoint(clientX, clientY);
        const newDrag: DragState = {
          ...drag,
          startPoint: drag.startPoint ?? worldPos,
          endPoint: worldPos,
          endScreen: { x: clientX, y: clientY },
        };
        dragRef.current = newDrag;
        onSetDrag(newDrag);
        return;
      }

      const worldPos = unprojectPoint(clientX, clientY);
      const ring = vortexSystem.findVortexAtPoint(worldPos, 1.2);
      if (ring) {
        setHoveredRingId(ring.id);
        setHoverInfo({
          ring,
          screenPos: { x: clientX, y: clientY },
        });
      } else {
        setHoveredRingId(null);
        setHoverInfo(null);
      }
    },
    [unprojectPoint, dragRef, onSetDrag, vortexSystem, setHoveredRingId, setHoverInfo]
  );

  const handlePointerUp = useCallback(
    (event: any) => {
      event.stopPropagation();
      const nativeEvent = event.nativeEvent || event;
      const clientX = nativeEvent.clientX ?? 0;
      const clientY = nativeEvent.clientY ?? 0;

      const drag = dragRef.current;
      if (drag && drag.isDragging && drag.startPoint && drag.endPoint) {
        const dx = drag.endScreen.x - drag.startScreen.x;
        const dy = drag.endScreen.y - drag.startScreen.y;
        const screenDist = Math.sqrt(dx * dx + dy * dy);
        const duration = (performance.now() - drag.startTime) / 1000;
        const screenSpeed = duration > 0 ? screenDist / duration / 100 : 0.5;

        const clickPos = unprojectPoint(clientX, clientY);

        if (shiftPressedRef.current) {
          const ring = vortexSystem.findVortexAtPoint(clickPos, 1.5);
          if (ring) {
            vortexSystem.splitVortex(ring.id);
            vortexSystem.addClickRipple(clickPos);
            dragRef.current = null;
            onSetDrag(null);
            return;
          }
        }

        vortexSystem.createVortex(
          drag.startPoint,
          drag.endPoint,
          drag.startScreen,
          drag.endScreen,
          screenSpeed
        );
        if (screenDist < 10) {
          vortexSystem.addClickRipple(clickPos);
          const ring = vortexSystem.findVortexAtPoint(clickPos, 1.5);
          if (ring && shiftPressedRef.current) {
            vortexSystem.splitVortex(ring.id);
          }
        }
      }
      dragRef.current = null;
      onSetDrag(null);
    },
    [unprojectPoint, dragRef, onSetDrag, vortexSystem, shiftPressedRef]
  );

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

interface DragPreview {
  dragRef: React.MutableRefObject<DragState | null>;
}

function DragPreviewComponent({ dragRef }: DragPreview) {
  const meshRef = useRef<THREE.Mesh>(null);
  const drag = dragRef.current;
  if (!drag || !drag.startPoint || !drag.endPoint) return null;
  const start = drag.startPoint;
  const end = drag.endPoint;
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  if (len < 0.1) return null;
  dir.normalize();

  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(dir, up).normalize();
  if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);
  const normal = new THREE.Vector3().crossVectors(tangent, dir).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  return (
    <>
      <mesh position={mid} quaternion={quaternion}>
        <torusGeometry args={[len * 0.5, 0.02, 8, 48]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={start.toArray()}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.8} depthWrite={false} />
      </mesh>
      <mesh position={end.toArray()}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </>
  );
}

interface SceneContentProps {
  vortexSystem: VortexSystem;
  dragRef: React.MutableRefObject<DragState | null>;
  hoveredRingId: number | null;
  setHoveredRingId: (id: number | null) => void;
  setHoverInfo: (info: HoverInfo | null) => void;
  setMergeEffectsKey: (n: number) => void;
  mergeEffectsKey: number;
  shiftPressedRef: React.MutableRefObject<boolean>;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  onSetDrag: (drag: DragState | null) => void;
}

function SceneContent({
  vortexSystem,
  dragRef,
  hoveredRingId,
  setHoveredRingId,
  setHoverInfo,
  setMergeEffectsKey,
  mergeEffectsKey,
  shiftPressedRef,
  canvasContainerRef,
  onSetDrag,
}: SceneContentProps) {
  return (
    <>
      <BackgroundGradient />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} color="#8a8aff" />
      <pointLight position={[-10, 5, -10]} intensity={0.4} color="#ff8ab0" />
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
      <GroundGrid />
      <ParticleSystem vortexSystem={vortexSystem} hoveredRingId={hoveredRingId} />

      {vortexSystem.getMergeEffects().map((eff) => (
        <MergeEffectMesh key={`m-${eff.id}`} effect={eff} />
      ))}
      {vortexSystem.getClickRippleEffects().map((eff) => (
        <ClickRippleMesh key={`c-${eff.id}`} effect={eff} />
      ))}

      <DragPreviewComponent dragRef={dragRef} />

      <SceneEventHandler
        vortexSystem={vortexSystem}
        dragRef={dragRef}
        setHoveredRingId={setHoveredRingId}
        setHoverInfo={setHoverInfo}
        setMergeEffectsKey={setMergeEffectsKey}
        mergeEffectsKey={mergeEffectsKey}
        shiftPressedRef={shiftPressedRef}
        canvasContainerRef={canvasContainerRef}
        onSetDrag={onSetDrag}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={50}
        makeDefault
      />
    </>
  );
}

export default function App() {
  const vortexSystemRef = useRef<VortexSystem>(new VortexSystem(MAX_PARTICLES));
  const dragRef = useRef<DragState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredRingId, setHoveredRingId] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [fps, setFps] = useState(0);
  const [totalParticles, setTotalParticles] = useState(0);
  const [timeScale, setTimeScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [mergeEffectsKey, setMergeEffectsKey] = useState(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const shiftPressedRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const shiftPressedStateRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftPressedRef.current = true;
        shiftPressedStateRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftPressedRef.current = false;
        shiftPressedStateRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastFpsTimeRef.current;
      const fpsVal = (frameCountRef.current * 1000) / elapsed;
      setFps(Math.round(fpsVal));
      setTotalParticles(vortexSystemRef.current.getTotalParticles());
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }, 1000);
    const tick = () => {
      frameCountRef.current++;
      requestAnimationFrame(tick);
    };
    tick();
    return () => clearInterval(interval);
  }, []);

  const handleTimeScaleChange = useCallback((val: number) => {
    setTimeScale(val);
    vortexSystemRef.current.setTimeScale(val);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.5, Math.min(3, timeScale + delta));
        handleTimeScaleChange(Math.round(newScale * 10) / 10);
      }
    },
    [timeScale, handleTimeScaleChange]
  );

  const onSetDrag = useCallback((drag: DragState | null) => {
    setDragState(drag);
  }, []);

  return (
    <div
      ref={canvasContainerRef}
      className="relative w-full h-full"
      style={{ background: 'radial-gradient(ellipse at center, #0A0A2E 0%, #1A0B2E 100%)' }}
      onWheel={handleWheel}
    >
      <Canvas
        shadows
        camera={{ position: [0, 6, 10], fov: 60, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        frameloop="always"
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <SceneContent
          vortexSystem={vortexSystemRef.current}
          dragRef={dragRef}
          hoveredRingId={hoveredRingId}
          setHoveredRingId={setHoveredRingId}
          setHoverInfo={setHoverInfo}
          setMergeEffectsKey={setMergeEffectsKey}
          mergeEffectsKey={mergeEffectsKey}
          shiftPressedRef={shiftPressedStateRef}
          canvasContainerRef={canvasContainerRef}
          onSetDrag={onSetDrag}
        />
      </Canvas>

      {!isMobile && (
        <div
          className="fixed top-4 left-4 z-10 font-mono text-sm"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: fps >= 45 ? '#00ff88' : fps >= 30 ? '#ffaa00' : '#ff4444' }}>●</span>
            <span className="text-white/90">FPS: {fps}</span>
          </div>
          <div className="text-cyan-300/80">粒子总数: {totalParticles.toLocaleString()}</div>
        </div>
      )}

      {isMobile && (
        <div
          className="fixed top-3 left-3 z-10 font-mono text-xs"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
        >
          <div className="text-cyan-300/80">粒子: {totalParticles.toLocaleString()}</div>
        </div>
      )}

      <div
        className={`fixed bottom-4 right-4 p-4 rounded-xl z-10 ${isMobile ? 'p-3 min-w-[240px]' : 'min-w-[280px]'}`}
        style={{
          background: 'rgba(10,10,46,0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className={`font-semibold mb-3 ${isMobile ? 'text-sm' : 'text-base'}`}
          style={{ color: '#00D4FF' }}
        >
          ⏱ 时间流逝控制
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-xs whitespace-nowrap">0.5x</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={timeScale}
            onChange={(e) => handleTimeScaleChange(parseFloat(e.target.value))}
            className="flex-1 cursor-pointer"
            style={{
              height: isMobile ? '44px' : 'auto',
              minHeight: '20px',
              accentColor: '#FF6B35',
            }}
          />
          <span className="text-white/70 text-xs whitespace-nowrap">3x</span>
        </div>
        <div
          className={`text-center font-mono mt-2 ${isMobile ? 'text-lg' : 'text-xl'}`}
          style={{ color: '#FF6B35' }}
        >
          {timeScale.toFixed(1)}x
        </div>
      </div>

      {hoverInfo && !isMobile && (
        <div
          className="fixed z-20 pointer-events-none p-3 rounded-lg"
          style={{
            left: Math.min(window.innerWidth - 200, hoverInfo.screenPos.x + 16),
            top: Math.min(window.innerHeight - 120, hoverInfo.screenPos.y + 16),
            background: 'rgba(10,10,46,0.85)',
            border: '1px solid rgba(255,107,53,0.4)',
            backdropFilter: 'blur(6px)',
            minWidth: '180px',
          }}
        >
          <div
            className="text-xs mb-2 font-semibold"
            style={{ color: '#FF6B35' }}
          >
            ◉ 涡旋环 #{hoverInfo.ring.id}
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-white/60">粒子数量:</span>
              <span className="text-white/90">{hoverInfo.ring.particleCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">剩余寿命:</span>
              <span className="text-cyan-300">
                {Math.max(0, hoverInfo.ring.lifetime - hoverInfo.ring.age).toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">当前半径:</span>
              <span className="text-purple-300">{hoverInfo.ring.radius.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed z-10 text-white/50 text-center pointer-events-none ${
          isMobile ? 'bottom-24 left-2 right-2 text-[10px]' : 'top-4 right-4 text-xs max-w-[260px] text-right'
        }`}
      >
        <div className="mb-1" style={{ color: 'rgba(255,107,53,0.8)' }}>● 点击拖拽生成涡旋</div>
        <div className="mb-1">● 按住 Shift 点击分裂涡旋</div>
        <div>● 两涡旋靠近自动合并</div>
        {!isMobile && <div className="mt-1 text-white/40">Ctrl + 滚轮: 调整时间流速</div>}
      </div>
    </div>
  );
}
