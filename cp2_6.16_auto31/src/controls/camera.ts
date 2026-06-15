import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function useCameraTransition() {
  const { camera, controls } = useThree();
  const isAnimatingRef = useRef(false);
  const startPosRef = useRef(new THREE.Vector3());
  const endPosRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const endTargetRef = useRef(new THREE.Vector3());
  const progressRef = useRef(0);
  const durationRef = useRef(0.8);
  const rafRef = useRef<number | null>(null);

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const animate = () => {
    if (!isAnimatingRef.current || !controls) return;

    progressRef.current += 1 / (60 * durationRef.current);
    const t = Math.min(progressRef.current, 1);
    const eased = easeOutCubic(t);

    camera.position.lerpVectors(startPosRef.current, endPosRef.current, eased);

    if (controls.target) {
      controls.target.lerpVectors(startTargetRef.current, endTargetRef.current, eased);
    }

    if (t >= 1) {
      isAnimatingRef.current = false;
      return;
    }

    rafRef.current = requestAnimationFrame(animate);
  };

  const transitionTo = (
    targetPosition: [number, number, number],
    lookAt: [number, number, number],
    duration: number = 0.8
  ) => {
    if (!controls) return;

    startPosRef.current.copy(camera.position);
    endPosRef.current.set(...targetPosition);
    startTargetRef.current.copy(controls.target || new THREE.Vector3());
    endTargetRef.current.set(...lookAt);
    durationRef.current = duration;
    progressRef.current = 0;
    isAnimatingRef.current = true;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    animate();
  };

  const zoomToArtifact = (position: [number, number, number]) => {
    const offset = new THREE.Vector3(2, 1.5, 2);
    const targetPos: [number, number, number] = [
      position[0] + offset.x,
      position[1] + offset.y,
      position[2] + offset.z,
    ];
    transitionTo(targetPos, position, 0.8);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { transitionTo, zoomToArtifact };
}
