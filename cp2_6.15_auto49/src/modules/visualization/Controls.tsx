import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, STRATUM } from '../../store';

const INITIAL_CAMERA = {
  position: new THREE.Vector3(200, 180, 200),
  target: new THREE.Vector3(0, -100, 0),
};

let rippleIdCounter = 0;

export default function SceneControls() {
  const controlsRef = useRef<any>(null);
  const { camera, gl, scene } = useThree();
  const setQueryPoint = useStore((s) => s.setQueryPoint);
  const addRipple = useStore((s) => s.addRipple);
  const resetAnimRef = useRef<{
    active: boolean;
    startPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    startTime: number;
  }>({ active: false, startPos: new THREE.Vector3(), startTarget: new THREE.Vector3(), startTime: 0 });

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.minDistance = 50;
      controlsRef.current.maxDistance = 800;
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.08;
      controlsRef.current.screenSpacePanning = true;
    }
  }, []);

  const resetCamera = useCallback(() => {
    if (!controlsRef.current) return;
    resetAnimRef.current = {
      active: true,
      startPos: camera.position.clone(),
      startTarget: controlsRef.current.target.clone(),
      startTime: performance.now(),
    };
  }, [camera]);

  useEffect(() => {
    (window as any).__resetStratumCamera = resetCamera;
    return () => {
      delete (window as any).__resetStratumCamera;
    };
  }, [resetCamera]);

  useFrame(() => {
    if (!resetAnimRef.current.active || !controlsRef.current) return;
    const { startPos, startTarget, startTime } = resetAnimRef.current;
    const elapsed = performance.now() - startTime;
    const duration = 800;
    const t = Math.min(elapsed / duration, 1.0);

    const springT = (x: number) => {
      const c4 = (2 * Math.PI) / 3;
      return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    };

    const eased = springT(t);
    camera.position.lerpVectors(startPos, INITIAL_CAMERA.position, eased);
    controlsRef.current.target.lerpVectors(startTarget, INITIAL_CAMERA.target, eased);
    controlsRef.current.update();

    if (t >= 1.0) {
      resetAnimRef.current.active = false;
    }
  });

  const handleClick = useCallback(
    (event: any) => {
      const { raycaster, point } = event;
      if (!raycaster || !point) return;
      const { cutX, cutZ } = useStore.getState();

      let isOnCrossSection = false;
      const tolerance = 1.5;

      if (cutX !== null) {
        if (Math.abs(point.x - cutX) < tolerance) isOnCrossSection = true;
      }
      if (cutZ !== null) {
        if (Math.abs(point.z - cutZ) < tolerance) isOnCrossSection = true;
      }

      const inX = point.x >= -STRATUM.width / 2 - 1 && point.x <= STRATUM.width / 2 + 1;
      const inZ = point.z >= -STRATUM.depth / 2 - 1 && point.z <= STRATUM.depth / 2 + 1;
      const inY = point.y >= STRATUM.yBottom - 1 && point.y <= STRATUM.yTop + 1;
      const inVolume = inX && inZ && inY;

      if (!isOnCrossSection && !inVolume) return;

      const finalPoint = point.clone();
      if (cutX !== null && Math.abs(finalPoint.x - cutX) > 0.5) {
        finalPoint.x = cutX;
      }
      if (cutZ !== null && Math.abs(finalPoint.z - cutZ) > 0.5) {
        finalPoint.z = cutZ;
      }

      const lithologies = ['砂岩', '页岩', '石灰岩', '花岗岩', '泥岩', '白云岩', '玄武岩', '片麻岩'];
      const hash = Math.abs(
        Math.sin(finalPoint.x * 12.9898 + finalPoint.y * 78.233 + finalPoint.z * 37.719) * 43758.5453
      ) % 1;
      const idx = Math.floor(hash * lithologies.length);
      const confidence = parseFloat((0.7 + hash * 0.3).toFixed(2));

      setQueryPoint({
        x: parseFloat(finalPoint.x.toFixed(1)),
        y: parseFloat(finalPoint.y.toFixed(1)),
        z: parseFloat(finalPoint.z.toFixed(1)),
        lithology: lithologies[idx],
        confidence,
      });

      addRipple({
        id: ++rippleIdCounter,
        x: finalPoint.x,
        y: finalPoint.y,
        z: finalPoint.z,
        timestamp: Date.now(),
      });
    },
    [setQueryPoint, addRipple]
  );

  useEffect(() => {
    camera.position.copy(INITIAL_CAMERA.position);
    if (controlsRef.current) {
      controlsRef.current.target.copy(INITIAL_CAMERA.target);
      controlsRef.current.update();
    }
  }, [camera]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, -100, 0]}
        onClick={handleClick}
      />
    </>
  );
}
