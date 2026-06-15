import { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export interface CollisionBox {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

interface UseGalleryControlsOptions {
  hallWidth: number;
  hallHeight: number;
  hallDepth: number;
  collisionBoxes?: CollisionBox[];
  onCollision?: () => void;
}

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.003;
const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.4;
const BOB_AMPLITUDE = 0.08;
const BOB_SPEED = 8;

export function useGalleryControls(options: UseGalleryControlsOptions) {
  const { hallWidth, hallHeight, hallDepth, collisionBoxes, onCollision } = options;

  const groupRef = useRef<THREE.Group>(null!);
  const [collisionFlash, setCollisionFlash] = useState(false);
  const isMovingRef = useRef(false);

  const keysRef = useRef<Set<string>>(new Set());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const bobPhaseRef = useRef(0);
  const collisionFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { gl } = useThree();

  const triggerCollisionFlash = useCallback(() => {
    if (collisionFlashTimerRef.current) {
      clearTimeout(collisionFlashTimerRef.current);
    }
    setCollisionFlash(true);
    collisionFlashTimerRef.current = setTimeout(() => {
      setCollisionFlash(false);
      collisionFlashTimerRef.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = () => {
      canvas.requestPointerLock();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;

      yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
      pitchRef.current -= e.movementY * MOUSE_SENSITIVITY;
      pitchRef.current = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitchRef.current));
    };

    canvas.addEventListener('click', handleClick);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl]);

  useEffect(() => {
    return () => {
      if (collisionFlashTimerRef.current) {
        clearTimeout(collisionFlashTimerRef.current);
      }
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const keys = keysRef.current;
    const forward =
      (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
      (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const right =
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
      (keys.has('a') || keys.has('arrowleft') ? 1 : 0);

    const moving = forward !== 0 || right !== 0;
    isMovingRef.current = moving;

    if (moving) {
      const yaw = yawRef.current;
      const forwardDir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const rightDir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(forwardDir, forward);
      moveDir.addScaledVector(rightDir, right);
      moveDir.normalize();

      const step = MOVE_SPEED * delta;
      const newPos = groupRef.current.position.clone();
      newPos.x += moveDir.x * step;
      newPos.z += moveDir.z * step;

      const halfW = hallWidth / 2 - PLAYER_RADIUS;
      const halfD = hallDepth / 2 - PLAYER_RADIUS;
      let collided = false;

      if (newPos.x < -halfW || newPos.x > halfW) {
        newPos.x = THREE.MathUtils.clamp(newPos.x, -halfW, halfW);
        collided = true;
      }

      if (newPos.z < -halfD || newPos.z > halfD) {
        newPos.z = THREE.MathUtils.clamp(newPos.z, -halfD, halfD);
        collided = true;
      }

      if (collisionBoxes) {
        for (const box of collisionBoxes) {
          const cx = Math.max(box.minX, Math.min(newPos.x, box.maxX));
          const cy = Math.max(box.minY, Math.min(newPos.y, box.maxY));
          const cz = Math.max(box.minZ, Math.min(newPos.z, box.maxZ));
          const dx = newPos.x - cx;
          const dy = newPos.y - cy;
          const dz = newPos.z - cz;
          const distSq = dx * dx + dy * dy + dz * dz;
          const r = PLAYER_RADIUS;

          const insideBox = newPos.x >= box.minX && newPos.x <= box.maxX && newPos.z >= box.minZ && newPos.z <= box.maxZ && newPos.y >= box.minY && newPos.y <= box.maxY;

          if (insideBox || distSq < 0.0001) {
            const penXMin = newPos.x - box.minX;
            const penXMax = box.maxX - newPos.x;
            const penZMin = newPos.z - box.minZ;
            const penZMax = box.maxZ - newPos.z;
            const minPen = Math.min(penXMin, penXMax, penZMin, penZMax);

            if (minPen === penXMin) {
              newPos.x = box.minX - r;
            } else if (minPen === penXMax) {
              newPos.x = box.maxX + r;
            } else if (minPen === penZMin) {
              newPos.z = box.minZ - r;
            } else if (minPen === penZMax) {
              newPos.z = box.maxZ + r;
            }
            collided = true;
          } else if (distSq < r * r) {
            const dist = Math.sqrt(distSq);
            const overlap = r - dist;
            newPos.x += (dx / dist) * overlap;
            newPos.z += (dz / dist) * overlap;
            collided = true;
          }
        }
      }

      if (collided) {
        triggerCollisionFlash();
        onCollision?.();
      }

      groupRef.current.position.x = newPos.x;
      groupRef.current.position.z = newPos.z;

      bobPhaseRef.current += delta * BOB_SPEED;
      groupRef.current.position.y = PLAYER_HEIGHT + Math.sin(bobPhaseRef.current) * BOB_AMPLITUDE;
    } else {
      bobPhaseRef.current = 0;
      groupRef.current.position.y = PLAYER_HEIGHT;
    }

    const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
    groupRef.current.quaternion.setFromEuler(euler);
  });

  return { groupRef, collisionFlash, isMoving: isMovingRef.current };
}
