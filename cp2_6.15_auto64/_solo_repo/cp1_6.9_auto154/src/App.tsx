import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MagneticField, POLE_PRESETS } from './MagneticField';
import { ParticleSystem } from './ParticleSystem';
import ControlPanel, { ControlPanelState } from './ControlPanel';

interface Ripple {
  id: number;
  pole: 'A' | 'B';
  startPos: THREE.Vector3;
  startTime: number;
}

function Scene({
  controlState,
  magneticFieldRef,
  particleSystemRef,
  poleARef,
  poleBRef,
  draggingRef,
  rippleListRef,
  onFrame,
}: {
  controlState: ControlPanelState;
  magneticFieldRef: React.MutableRefObject<MagneticField>;
  particleSystemRef: React.MutableRefObject<ParticleSystem>;
  poleARef: React.MutableRefObject<THREE.Mesh | null>;
  poleBRef: React.MutableRefObject<THREE.Mesh | null>;
  draggingRef: React.MutableRefObject<{ pole: 'A' | 'B' | null; lastPos: THREE.Vector3 | null }>;
  rippleListRef: React.MutableRefObject<Ripple[]>;
  onFrame: () => void;
}) {
  const { scene, camera, raycaster, pointer } = useThree();
  const particlePointsRef = useRef<THREE.Points | null>(null);
  const fieldLinesRef = useRef<THREE.Group | null>(null);
  const rippleMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const rippleIdCounter = useRef(0);

  useEffect(() => {
    particleSystemRef.current.init(controlState.particleCount);
    if (particleSystemRef.current.points) {
      particlePointsRef.current = particleSystemRef.current.points;
      scene.add(particleSystemRef.current.points);
    }
    magneticFieldRef.current.setStrengthMultiplier(controlState.strengthMultiplier);
    const preset = POLE_PRESETS[controlState.presetIndex];
    magneticFieldRef.current.setPoleA(preset.poleA);
    magneticFieldRef.current.setPoleB(preset.poleB);
    if (poleARef.current) poleARef.current.position.copy(preset.poleA);
    if (poleBRef.current) poleBRef.current.position.copy(preset.poleB);

    return () => {
      if (particleSystemRef.current.points) {
        scene.remove(particleSystemRef.current.points);
      }
      particleSystemRef.current.dispose();
    };
  }, [controlState.presetIndex]);

  useEffect(() => {
    const currentCount = particleSystemRef.current.getCount();
    if (currentCount !== controlState.particleCount) {
      if (particleSystemRef.current.points) {
        scene.remove(particleSystemRef.current.points);
      }
      particleSystemRef.current.dispose();
      particleSystemRef.current.init(controlState.particleCount);
      if (particleSystemRef.current.points) {
        particlePointsRef.current = particleSystemRef.current.points;
        scene.add(particleSystemRef.current.points);
      }
    }
    magneticFieldRef.current.setStrengthMultiplier(controlState.strengthMultiplier);
  }, [controlState.particleCount, controlState.strengthMultiplier]);

  useEffect(() => {
    if (fieldLinesRef.current) {
      scene.remove(fieldLinesRef.current);
      fieldLinesRef.current.traverse((obj) => {
        if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    fieldLinesRef.current = new THREE.Group();
    rebuildFieldLines();
    scene.add(fieldLinesRef.current);

    return () => {
      if (fieldLinesRef.current) {
        scene.remove(fieldLinesRef.current);
      }
    };
  }, []);

  const rebuildFieldLines = useCallback(() => {
    if (!fieldLinesRef.current) return;
    fieldLinesRef.current.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    fieldLinesRef.current!.clear();

    const lines = magneticFieldRef.current.getFieldLines(12, 20);
    lines.forEach((linePoints, lineIdx) => {
      const positions = new Float32Array(linePoints.length * 3);
      const colors = new Float32Array(linePoints.length * 3);

      for (let i = 0; i < linePoints.length; i++) {
        const i3 = i * 3;
        positions[i3] = linePoints[i].x;
        positions[i3 + 1] = linePoints[i].y;
        positions[i3 + 2] = linePoints[i].z;

        const t = i / (linePoints.length - 1);
        colors[i3] = 1 - t * 0.3;
        colors[i3 + 1] = 0.2 + (1 - t) * 0.3;
        colors[i3 + 2] = 0.6 + t * 0.4;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.35,
        linewidth: 1,
      });

      const line = new THREE.Line(geo, mat);
      fieldLinesRef.current!.add(line);
    });
  }, []);

  const updateFieldLinesPositions = useCallback(() => {
    if (!fieldLinesRef.current) return;
    const lines = magneticFieldRef.current.getFieldLines(12, 20);

    fieldLinesRef.current.children.forEach((child, lineIdx) => {
      if (!(child instanceof THREE.Line) || !lines[lineIdx]) return;
      const linePoints = lines[lineIdx];
      const posAttr = child.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = child.geometry.getAttribute('color') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const colorArr = colorAttr.array as Float32Array;

      for (let i = 0; i < linePoints.length; i++) {
        const i3 = i * 3;
        posArr[i3] = linePoints[i].x;
        posArr[i3 + 1] = linePoints[i].y;
        posArr[i3 + 2] = linePoints[i].z;

        const t = i / (linePoints.length - 1);
        colorArr[i3] = 1 - t * 0.3;
        colorArr[i3 + 1] = 0.2 + (1 - t) * 0.3;
        colorArr[i3 + 2] = 0.6 + t * 0.4;
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    });
  }, []);

  const spawnRipple = useCallback((pole: 'A' | 'B', pos: THREE.Vector3) => {
    const id = rippleIdCounter.current++;
    rippleListRef.current.push({
      id,
      pole,
      startPos: pos.clone(),
      startTime: performance.now(),
    });

    const geometry = new THREE.RingGeometry(0.1, 0.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: pole === 'A' ? 0xff4444 : 0x4488ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.lookAt(camera.position);
    scene.add(mesh);
    rippleMeshesRef.current.set(id, mesh);
  }, [camera.position, scene]);

  useFrame((_, delta) => {
    if (draggingRef.current.pole) {
      if (draggingRef.current.pole === 'A' && poleARef.current) {
        magneticFieldRef.current.setPoleA(poleARef.current.position);
      } else if (draggingRef.current.pole === 'B' && poleBRef.current) {
        magneticFieldRef.current.setPoleB(poleBRef.current.position);
      }
    }

    updateFieldLinesPositions();

    particleSystemRef.current.update(delta, magneticFieldRef.current);

    const now = performance.now();
    const ripplesToRemove: number[] = [];
    rippleListRef.current.forEach((ripple) => {
      const elapsed = (now - ripple.startTime) / 1000;
      const mesh = rippleMeshesRef.current.get(ripple.id);
      if (elapsed > 0.3) {
        ripplesToRemove.push(ripple.id);
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
          rippleMeshesRef.current.delete(ripple.id);
        }
      } else {
        const t = elapsed / 0.3;
        const innerR = t * 30;
        const outerR = innerR + 1.5;
        if (mesh) {
          mesh.geometry.dispose();
          mesh.geometry = new THREE.RingGeometry(innerR, outerR, 32);
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
          const polePos = ripple.pole === 'A'
            ? magneticFieldRef.current.poleA
            : magneticFieldRef.current.poleB;
          mesh.position.copy(polePos);
          mesh.lookAt(camera.position);
        }
      }
    });
    if (ripplesToRemove.length > 0) {
      rippleListRef.current = rippleListRef.current.filter(
        (r) => !ripplesToRemove.includes(r.id)
      );
    }

    onFrame();
  });

  const handlePointerDownPole = (pole: 'A' | 'B') => (e: any) => {
    e.stopPropagation();
    draggingRef.current.pole = pole;
    const mesh = pole === 'A' ? poleARef.current : poleBRef.current;
    if (mesh) {
      draggingRef.current.lastPos = mesh.position.clone();
      document.body.style.cursor = 'grabbing';
      spawnRipple(pole, mesh.position);
    }
  };

  const handlePointerUp = (e: any) => {
    if (draggingRef.current.pole) {
      draggingRef.current.pole = null;
      draggingRef.current.lastPos = null;
      document.body.style.cursor = '';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current.pole) return;

      const mesh = draggingRef.current.pole === 'A' ? poleARef.current : poleBRef.current;
      if (!mesh) return;

      raycaster.setFromCamera(pointer, camera);

      const planeNormal = new THREE.Vector3();
      camera.getWorldDirection(planeNormal);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        planeNormal,
        mesh.position
      );

      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        mesh.position.copy(intersection);
      }
    };

    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [camera, pointer, raycaster]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[100, 100, 100]} intensity={0.6} />
      <pointLight position={[-100, -50, 50]} intensity={0.3} color="#4488ff" />

      <gridHelper
        args={[400, 40, '#1a1a40', '#1a1a40']}
        position={[0, -100, 0]}
        userData={{ opacity: 0.3 }}
      />

      <mesh
        ref={poleARef as any}
        onPointerDown={handlePointerDownPole('A')}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!draggingRef.current.pole) document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          if (!draggingRef.current.pole) document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[6, 32, 32]} />
        <meshStandardMaterial
          color="#ff4444"
          emissive="#ff2222"
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh
        ref={poleBRef as any}
        onPointerDown={handlePointerDownPole('B')}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!draggingRef.current.pole) document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          if (!draggingRef.current.pole) document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[6, 32, 32]} />
        <meshStandardMaterial
          color="#4488ff"
          emissive="#2266ff"
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={magneticFieldRef.current.poleA.toArray()}>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.15} />
      </mesh>
      <mesh position={magneticFieldRef.current.poleB.toArray()}>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.15} />
      </mesh>

      <OrbitControls
        makeDefault
        enablePan={true}
        enableDamping
        dampingFactor={0.05}
        minDistance={80}
        maxDistance={600}
      />
    </>
  );
}

export default function App() {
  const [controlState, setControlState] = useState<ControlPanelState>({
    presetIndex: 0,
    particleCount: 3000,
    strengthMultiplier: 1.0,
  });

  const magneticFieldRef = useRef<MagneticField>(new MagneticField());
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const poleARef = useRef<THREE.Mesh | null>(null);
  const poleBRef = useRef<THREE.Mesh | null>(null);
  const draggingRef = useRef<{ pole: 'A' | 'B' | null; lastPos: THREE.Vector3 | null }>({
    pole: null,
    lastPos: null,
  });
  const rippleListRef = useRef<Ripple[]>([]);
  const frameCounter = useRef(0);
  const fpsRef = useRef(0);
  const lastFpsTime = useRef(performance.now());

  const onFrame = useCallback(() => {
    frameCounter.current++;
    const now = performance.now();
    if (now - lastFpsTime.current >= 1000) {
      fpsRef.current = frameCounter.current;
      frameCounter.current = 0;
      lastFpsTime.current = now;
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ControlPanel state={controlState} onChange={setControlState} />

      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '8px 14px',
          background: 'rgba(10, 10, 32, 0.7)',
          border: '1px solid #2a2a5a',
          borderRadius: '6px',
          color: '#8080c0',
          fontFamily: 'monospace',
          fontSize: '11px',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
        }}
      >
        <div>粒子: <span style={{ color: '#70b0ff' }}>{controlState.particleCount.toLocaleString()}</span></div>
        <div>场强: <span style={{ color: '#70ff90' }}>{controlState.strengthMultiplier.toFixed(1)}x</span></div>
      </div>

      <Canvas
        camera={{ position: [0, 50, 250], fov: 60, near: 1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0a20' }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <color attach="background" args={['#0a0a20']} />
        <fog attach="fog" args={['#0a0a20', 200, 550]} />
        <Scene
          controlState={controlState}
          magneticFieldRef={magneticFieldRef}
          particleSystemRef={particleSystemRef}
          poleARef={poleARef}
          poleBRef={poleBRef}
          draggingRef={draggingRef}
          rippleListRef={rippleListRef}
          onFrame={onFrame}
        />
      </Canvas>
    </div>
  );
}
