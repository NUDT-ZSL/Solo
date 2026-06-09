import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { FurnitureId, LightConfig, ROOM_SIZE, WARM_LIGHT, COOL_LIGHT } from '../types';
import { furnitureController } from '../FurnitureController';
import Room from './Room';
import { Sofa, CoffeeTable, FloorLamp, Shelf, Carpet } from './Furniture';

interface SceneProps {
  selectedId: FurnitureId | null;
  onSelect: (id: FurnitureId | null) => void;
  lightValue: number;
  cameraPreset: string | null;
  onCameraPresetDone: () => void;
}

interface CameraTarget {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const CAMERA_PRESETS: Record<string, CameraTarget> = {
  top: { position: new THREE.Vector3(0, 7.2, 0.001), target: new THREE.Vector3(0, 0, 0) },
  living: { position: new THREE.Vector3(0, 2.0, 6.2), target: new THREE.Vector3(0, 0.8, 0) },
  corner: { position: new THREE.Vector3(-4.5, 3.0, -4.5), target: new THREE.Vector3(0, 0.5, 0) },
};

function lerpColor(hex1: string, hex2: string, t: number): string {
  const c1 = new THREE.Color(hex1);
  const c2 = new THREE.Color(hex2);
  const c = c1.clone().lerp(c2, t);
  return `#${c.getHexString()}`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cubicBezier3D(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  const p = p0.clone().multiplyScalar(uuu)
    .add(p1.clone().multiplyScalar(3 * uu * t))
    .add(p2.clone().multiplyScalar(3 * u * tt))
    .add(p3.clone().multiplyScalar(ttt));
  return p;
}

export default function Scene({ selectedId, onSelect, lightValue, cameraPreset, onCameraPresetDone }: SceneProps) {
  const { camera, scene, gl, raycaster, pointer } = useThree();
  const controlsRef = useRef<any>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const groundPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const draggingId = useRef<FurnitureId | null>(null);
  const dragPoint = useRef(new THREE.Vector3());
  const dragOffset = useRef(new THREE.Vector3());
  const cameraAnim = useRef<{
    active: boolean;
    startPos: THREE.Vector3;
    ctrlPt1: THREE.Vector3;
    ctrlPt2: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null>(null);

  const lightConfig = useMemo<LightConfig>(() => {
    const t = Math.round(lightValue / 10) / 10;
    const intensity = 0.8 + (lightValue / 100) * 0.4;
    const colorHex = lerpColor(WARM_LIGHT, COOL_LIGHT, t);
    return { intensity, colorHex };
  }, [lightValue]);

  useEffect(() => {
    camera.position.set(CAMERA_PRESETS.living.position.x, CAMERA_PRESETS.living.position.y, CAMERA_PRESETS.living.position.z);
    if (controlsRef.current) {
      controlsRef.current.target.copy(CAMERA_PRESETS.living.target);
      controlsRef.current.update();
    }
  }, []);

  useEffect(() => {
    if (!cameraPreset || !CAMERA_PRESETS[cameraPreset]) return;
    const preset = CAMERA_PRESETS[cameraPreset];
    const startPos = camera.position.clone();
    const endPos = preset.position.clone();
    const startTarget = controlsRef.current?.target.clone() || new THREE.Vector3(0, 0.5, 0);
    const endTarget = preset.target.clone();
    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);
    const lift = 2.5;
    const ctrlPt1 = new THREE.Vector3(
      startPos.x + (midPoint.x - startPos.x) * 0.5,
      Math.max(startPos.y, endPos.y) + lift,
      startPos.z + (midPoint.z - startPos.z) * 0.5,
    );
    const ctrlPt2 = new THREE.Vector3(
      endPos.x - (endPos.x - midPoint.x) * 0.5,
      Math.max(startPos.y, endPos.y) + lift,
      endPos.z - (endPos.z - midPoint.z) * 0.5,
    );

    cameraAnim.current = {
      active: true,
      startPos,
      ctrlPt1,
      ctrlPt2,
      endPos,
      startTarget,
      endTarget,
      startTime: performance.now(),
      duration: 2000,
    };
  }, [cameraPreset]);

  useEffect(() => {
    if (ambientLightRef.current) {
      const color = new THREE.Color(lightConfig.colorHex);
      ambientLightRef.current.color.lerp(color, 0.2);
      ambientLightRef.current.intensity = lightConfig.intensity * 0.55;
    }
    if (dirLightRef.current) {
      const color = new THREE.Color(lightConfig.colorHex);
      dirLightRef.current.color.lerp(color, 0.2);
      dirLightRef.current.intensity = lightConfig.intensity;
    }
  }, [lightConfig]);

  const handleSelect = (id: FurnitureId) => {
    onSelect(id);
  };

  const handleDragStart = (id: FurnitureId) => {
    draggingId.current = id;
    const state = furnitureController.getState(id);
    if (!state) return;
    dragPoint.current.set(state.position[0], state.baseY, state.position[2]);

    raycaster.setFromCamera(pointer, camera);
    const intersect = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlaneRef.current, intersect)) {
      dragOffset.current.copy(dragPoint.current).sub(intersect);
    }
    document.body.style.cursor = 'crosshair';
  };

  const handleDragMove = () => {
    if (!draggingId.current) return;
    const intersect = new THREE.Vector3();
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(groundPlaneRef.current, intersect)) return;
    const newX = intersect.x + dragOffset.current.x;
    const newZ = intersect.z + dragOffset.current.z;
    const state = furnitureController.getState(draggingId.current);
    if (state) {
      const halfW = ROOM_SIZE.width / 2 - 0.4;
      const halfD = ROOM_SIZE.depth / 2 - 0.4;
      const clampedX = Math.max(-halfW, Math.min(halfW, newX));
      const clampedZ = Math.max(-halfD, Math.min(halfD, newZ));
      state.position[0] = clampedX;
      state.position[2] = clampedZ;
    }
    if (dirLightRef.current && dirLightRef.current.shadow && dirLightRef.current.shadow.map) {
      dirLightRef.current.shadow.map.needsUpdate = true;
    }
  };

  const handleDragEnd = (id: FurnitureId) => {
    if (draggingId.current === id) {
      const state = furnitureController.getState(id);
      if (state) {
        furnitureController.updateFurniturePosition(id, state.position[0], state.position[2], true);
      }
      draggingId.current = null;
      document.body.style.cursor = '';
    }
  };

  const handleCanvasPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.target === gl.domElement && !draggingId.current) {
      onSelect(null);
    }
  };

  useFrame(() => {
    furnitureController.updateAnimations();

    if (draggingId.current) {
      handleDragMove();
    }

    if (cameraAnim.current && cameraAnim.current.active) {
      const anim = cameraAnim.current;
      const elapsed = performance.now() - anim.startTime;
      const rawT = Math.min(elapsed / anim.duration, 1);
      const t = easeInOutCubic(rawT);
      const newPos = cubicBezier3D(anim.startPos, anim.ctrlPt1, anim.ctrlPt2, anim.endPos, t);
      camera.position.copy(newPos);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, t);
        controlsRef.current.update();
      }
      if (rawT >= 1) {
        cameraAnim.current.active = false;
        cameraAnim.current = null;
        onCameraPresetDone();
      }
    }
  });

  const allStates = furnitureController.getAllStates();
  const furnitureById = Object.fromEntries(allStates.map((s) => [s.id, s]));

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.55} color={lightConfig.colorHex} />
      <directionalLight
        ref={dirLightRef}
        position={[3.5, 5.5, 3]}
        intensity={1.0}
        color={lightConfig.colorHex}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <hemisphereLight args={[lightConfig.colorHex, '#2C2C2C', 0.2]} intensity={0.25} />
      <fog attach="fog" args={['#2C2C2C', 8, 22]} />

      <group onPointerDown={handleCanvasPointerDown}>
        <Room />

        <Sofa
          id="sofa"
          material={furnitureById.sofa.material}
          selected={selectedId === 'sofa'}
          onSelect={handleSelect}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isDragging={draggingId.current === 'sofa'}
        />
        <CoffeeTable
          id="coffeeTable"
          material={furnitureById.coffeeTable.material}
          selected={selectedId === 'coffeeTable'}
          onSelect={handleSelect}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isDragging={draggingId.current === 'coffeeTable'}
        />
        <FloorLamp
          id="floorLamp"
          material={furnitureById.floorLamp.material}
          selected={selectedId === 'floorLamp'}
          onSelect={handleSelect}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isDragging={draggingId.current === 'floorLamp'}
        />
        <Shelf
          id="shelf"
          material={furnitureById.shelf.material}
          selected={selectedId === 'shelf'}
          onSelect={handleSelect}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isDragging={draggingId.current === 'shelf'}
        />
        <Carpet
          id="carpet"
          material={furnitureById.carpet.material}
          selected={selectedId === 'carpet'}
          onSelect={handleSelect}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isDragging={draggingId.current === 'carpet'}
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.5, 0]}
        minDistance={2}
        maxDistance={12}
        maxPolarAngle={Math.PI / 2 - 0.02}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
      />
    </>
  );
}
