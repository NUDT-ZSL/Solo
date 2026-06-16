import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Particle, DensityParams } from './particleEngine';
import { generateNebula, updateParticles, interpolateColors } from './particleEngine';

interface SceneProps {
  params: DensityParams;
  opacity: number;
  onParticleClick: (particle: Particle | null) => void;
  onHoverParticle: (particle: Particle | null) => void;
}

const STAR_COUNT = 500;

function StarField() {
  const meshRef = useRef<THREE.Points>(null);
  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const sz = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 100;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = 0.3 + Math.random() * 0.5;
    }
    return { positions: pos, sizes: sz };
  }, []);

  const twinkleRef = useRef(0);
  useFrame((_, delta) => {
    twinkleRef.current += delta;
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.PointsMaterial;
      const t = (Math.sin(twinkleRef.current * Math.PI) + 1) * 0.5;
      material.opacity = 0.15 + t * 0.2;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={STAR_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFFFFF"
        size={0.4}
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function HoverGlow({ position }: { position: THREE.Vector3 | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current && position) {
      meshRef.current.position.lerp(position, 0.15);
      meshRef.current.visible = true;
    } else if (meshRef.current) {
      meshRef.current.visible = false;
    }
  });

  if (!position) return <mesh ref={meshRef} visible={false} />;

  return (
    <mesh ref={meshRef} position={position}>
      <circleGeometry args={[2, 32]} />
      <meshBasicMaterial
        color="#FFFFFF"
        transparent
        opacity={0.2}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ParticleSystem({ params, opacity, onParticleClick, onHoverParticle }: SceneProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [hoverPos, setHoverPos] = useState<THREE.Vector3 | null>(null);
  const drawRangeRef = useRef<number>(params.particleCount);
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const lastFrustrumCheck = useRef(0);
  const prevParamsRef = useRef<DensityParams>(params);

  const initialData = useMemo(() => {
    const particles = generateNebula(params);
    particlesRef.current = particles;
    const count = particles.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      colors[i * 3] = p.color[0];
      colors[i * 3 + 1] = p.color[1];
      colors[i * 3 + 2] = p.color[2];
      sizes[i] = p.size;
    }
    return { positions, colors, sizes, count };
  }, [params.particleCount, params.nebulaType, params.colorPreset, params.radius, params.spiralArms, params.concentration]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(initialData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(initialData.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(initialData.sizes, 1));
    geo.setDrawRange(0, initialData.count);
    return geo;
  }, [initialData]);

  useEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.setAttribute('position', new THREE.BufferAttribute(initialData.positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(initialData.colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(initialData.sizes, 1));
      geo.setDrawRange(0, initialData.count);
      drawRangeRef.current = initialData.count;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  }, [initialData]);

  useEffect(() => {
    const prev = prevParamsRef.current;
    if (prev.colorPreset !== params.colorPreset && pointsRef.current) {
      const newColors = interpolateColors(particlesRef.current, params.colorPreset, params.radius);
      const colorAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
      colorAttr.array.set(newColors);
      colorAttr.needsUpdate = true;
    }
    prevParamsRef.current = params;
  }, [params]);

  const computeDrawRange = useCallback(() => {
    if (!pointsRef.current || params.particleCount <= 20000) {
      drawRangeRef.current = params.particleCount;
      return;
    }

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    let visible = 0;
    const total = params.particleCount;
    const step = total > 30000 ? 3 : 2;

    for (let i = 0; i < total; i += step) {
      const v = new THREE.Vector3(
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i)
      );
      if (frustum.containsPoint(v)) {
        visible += step;
      }
    }

    drawRangeRef.current = Math.min(visible, total);
  }, [camera, params.particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = opacity;

    const time = state.clock.elapsedTime;
    const positions = updateParticles(particlesRef.current, time, params.rotationSpeed);
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.array.set(positions);
    posAttr.needsUpdate = true;

    lastFrustrumCheck.current += delta;
    if (lastFrustrumCheck.current > 0.5 && params.particleCount > 20000) {
      lastFrustrumCheck.current = 0;
      computeDrawRange();
    }

    const currentRange = drawRangeRef.current;
    pointsRef.current.geometry.setDrawRange(0, currentRange);
  });

  const handlePointerMove = useCallback((e: any) => {
    if (!pointsRef.current) return;
    mouse.current.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse.current, camera);
    raycaster.current.params.Points = { threshold: 1.5 };
    const intersects = raycaster.current.intersectObject(pointsRef.current);
    if (intersects.length > 0) {
      const idx = intersects[0].index;
      if (idx !== undefined) {
        const particle = particlesRef.current[idx];
        if (particle) {
          const pos = new THREE.Vector3(particle.x, particle.y, particle.z);
          setHoverPos(pos);
          onHoverParticle(particle);
          gl.domElement.style.cursor = 'pointer';
          return;
        }
      }
    }
    setHoverPos(null);
    onHoverParticle(null);
    gl.domElement.style.cursor = 'default';
  }, [camera, gl, onHoverParticle]);

  const handleClick = useCallback((e: any) => {
    if (!pointsRef.current) return;
    mouse.current.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse.current, camera);
    raycaster.current.params.Points = { threshold: 1.5 };
    const intersects = raycaster.current.intersectObject(pointsRef.current);
    if (intersects.length > 0) {
      const idx = intersects[0].index;
      if (idx !== undefined) {
        const particle = particlesRef.current[idx];
        if (particle) {
          onParticleClick(particle);
        }
      }
    }
  }, [camera, onParticleClick]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [gl, handlePointerMove, handleClick]);

  return (
    <>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          vertexColors
          size={0.3}
          transparent
          opacity={opacity}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <HoverGlow position={hoverPos} />
    </>
  );
}

function FPSCounter() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      frameCount.current++;
      const now = performance.now();
      if (now - lastTime.current >= 500) {
        const elapsed = (now - lastTime.current) / 1000;
        setFps(Math.round(frameCount.current / elapsed));
        frameCount.current = 0;
        lastTime.current = now;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        background: 'rgba(0, 0, 0, 0.5)',
        color: '#FFFFFF',
        fontSize: 12,
        padding: '4px 8px',
        borderRadius: 4,
        fontFamily: 'monospace',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      {fps} FPS
    </div>
  );
}

function ParticleInfoCard({ particle, onClose }: { particle: Particle | null; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const [slidIn, setSlidIn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (particle) {
      setVisible(true);
      requestAnimationFrame(() => setSlidIn(true));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSlidIn(false);
        setTimeout(() => {
          setVisible(false);
          onClose();
        }, 300);
      }, 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [particle, onClose]);

  if (!visible || !particle) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: slidIn ? 80 : -200,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: 10,
        padding: '14px 20px',
        color: '#FFFFFF',
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: 13,
        zIndex: 150,
        border: '1px solid rgba(255,255,255,0.15)',
        transition: 'bottom 0.3s ease, opacity 0.3s ease',
        opacity: slidIn ? 1 : 0,
        minWidth: 220,
        pointerEvents: 'none',
      }}
    >
      <div style={{ marginBottom: 6, color: '#3498DB', fontWeight: 600, fontSize: 14 }}>粒子信息</div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>ID: </span>
        {particle.id}
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>坐标: </span>
        ({particle.x.toFixed(2)}, {particle.y.toFixed(2)}, {particle.z.toFixed(2)})
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>颜色: </span>
        <span style={{ fontFamily: 'monospace' }}>{particle.colorHex}</span>
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: 3,
            background: particle.colorHex,
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        />
      </div>
    </div>
  );
}

function SceneCanvas({ params, opacity, onParticleClick, onHoverParticle }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 30, 80], fov: 60, near: 0.1, far: 500 }}
      style={{ background: '#000000' }}
      dpr={[1, 1.5]}
    >
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        enablePan
        enableZoom
        enableRotate
        zoomSpeed={0.8}
        rotateSpeed={0.8}
        minDistance={10}
        maxDistance={250}
      />
      <ambientLight intensity={0.1} />
      <StarField />
      <ParticleSystem
        params={params}
        opacity={opacity}
        onParticleClick={onParticleClick}
        onHoverParticle={onHoverParticle}
      />
    </Canvas>
  );
}

export { SceneCanvas, FPSCounter, ParticleInfoCard };
