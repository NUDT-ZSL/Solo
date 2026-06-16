import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';

export interface CameraControllerState {
  rotationY: number;
  rotationX: number;
  zoom: number;
}

export function useCameraController() {
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [zoom, setZoom] = useState(12);

  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ y: 0, x: 0 });
  const targetZoomRef = useRef(12);
  const animationRef = useRef<number | null>(null);

  const MIN_ROTATION_X = -Math.PI / 3;
  const MAX_ROTATION_X = Math.PI / 3;
  const MIN_ZOOM = 2;
  const MAX_ZOOM = 20;
  const TRANSITION_DURATION = 400;

  const animateCamera = useCallback(() => {
    const lerpFactor = 0.12;

    setRotationY((prev) => {
      const diff = targetRotationRef.current.y - prev;
      if (Math.abs(diff) < 0.001) return targetRotationRef.current.y;
      return prev + diff * lerpFactor;
    });

    setRotationX((prev) => {
      const diff = targetRotationRef.current.x - prev;
      if (Math.abs(diff) < 0.001) return targetRotationRef.current.x;
      return prev + diff * lerpFactor;
    });

    setZoom((prev) => {
      const diff = targetZoomRef.current - prev;
      if (Math.abs(diff) < 0.01) return targetZoomRef.current;
      return prev + diff * lerpFactor;
    });

    animationRef.current = requestAnimationFrame(animateCamera);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animateCamera);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animateCamera]);

  const onPointerDown = useCallback((e: any) => {
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX || e.point?.x || 0, y: e.clientY || e.point?.y || 0 };
  }, []);

  const onPointerMove = useCallback((e: any) => {
    if (!isDraggingRef.current) return;

    const clientX = e.clientX || e.point?.x || 0;
    const clientY = e.clientY || e.point?.y || 0;

    const deltaX = clientX - lastPointerRef.current.x;
    const deltaY = clientY - lastPointerRef.current.y;

    targetRotationRef.current.y += deltaX * 0.005;
    targetRotationRef.current.x = Math.max(
      MIN_ROTATION_X,
      Math.min(MAX_ROTATION_X, targetRotationRef.current.x + deltaY * 0.005)
    );

    lastPointerRef.current = { x: clientX, y: clientY };
  }, []);

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const onWheel = useCallback((e: any) => {
    e?.stopPropagation?.();
    const delta = (e as WheelEvent).deltaY || (e as any).nativeEvent?.deltaY || 0;
    const zoomFactor = delta > 0 ? 1.08 : 0.92;
    targetZoomRef.current = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, targetZoomRef.current * zoomFactor)
    );
  }, []);

  return {
    rotationY,
    rotationX,
    zoom,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    setTargetRotation: (y: number, x: number) => {
      targetRotationRef.current = { y, x };
    },
    setTargetZoom: (z: number) => {
      targetZoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    },
  };
}
