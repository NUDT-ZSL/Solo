import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  LightSourceParams,
  RaySegment,
  RefractionAngles,
  CausticSpot,
  FlashEffect,
  Vector3,
  SPECTRUM_COLORS
} from '../types/physicsTypes';
import {
  calculateRefraction,
  calculateDispersedRayDirections,
  calculateCriticalAngle
} from '../utils/snellLaw';

const DEFAULT_LIGHT_POSITION: Vector3 = { x: -1.5, y: 1.5, z: 0 };
const WATER_SURFACE_Y = 0;
const FLOOR_Y = -2.5;
const SCENE_WIDTH = 8;
const MAX_CAUSTIC_SPOTS = 50;

export const useLightSimulation = () => {
  const [lightSource, setLightSource] = useState<LightSourceParams>({
    position: DEFAULT_LIGHT_POSITION,
    incidentAngle: 30,
    intensity: 1.0,
    color: '#ffffff'
  });

  const [flashEffect, setFlashEffect] = useState<FlashEffect>({
    active: false,
    position: { x: 0, y: 0, z: 0 },
    startTime: 0,
    duration: 500
  });

  const animationTimeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const wasTotalReflectionRef = useRef(false);

  const angles: RefractionAngles = useMemo(() => {
    return calculateRefraction(lightSource.incidentAngle);
  }, [lightSource.incidentAngle]);

  const intersectionPoint: Vector3 = useMemo(() => {
    const incidentRad = (lightSource.incidentAngle * Math.PI) / 180;
    const lightY = lightSource.position.y;
    const dx = lightY * Math.tan(incidentRad);
    return {
      x: lightSource.position.x + dx,
      y: WATER_SURFACE_Y,
      z: lightSource.position.z
    };
  }, [lightSource]);

  useEffect(() => {
    if (angles.isTotalReflection && !wasTotalReflectionRef.current) {
      setFlashEffect({
        active: true,
        position: { ...intersectionPoint },
        startTime: performance.now(),
        duration: 500
      });
    }
    wasTotalReflectionRef.current = angles.isTotalReflection;
  }, [angles.isTotalReflection, intersectionPoint]);

  const rays: RaySegment[] = useMemo(() => {
    const result: RaySegment[] = [];
    const incidentRad = (lightSource.incidentAngle * Math.PI) / 180;

    result.push({
      start: { ...lightSource.position },
      end: { ...intersectionPoint },
      color: '#ffffff',
      opacity: 1.0,
      lineWidth: 2,
      isDashed: false
    });

    const reflectAngleRad = incidentRad;
    const reflectLength = 3;
    result.push({
      start: { ...intersectionPoint },
      end: {
        x: intersectionPoint.x + Math.sin(reflectAngleRad) * reflectLength,
        y: intersectionPoint.y + Math.cos(reflectAngleRad) * reflectLength,
        z: intersectionPoint.z
      },
      color: '#e0e0e0',
      opacity: 0.3,
      lineWidth: 1,
      isDashed: true
    });

    if (!angles.isTotalReflection) {
      const dispersedDirections = calculateDispersedRayDirections(lightSource.incidentAngle);
      dispersedDirections.forEach((disp) => {
        const refractedLength = 5;
        const endX = intersectionPoint.x + disp.direction.x * refractedLength;
        const endY = intersectionPoint.y + disp.direction.y * refractedLength;

        result.push({
          start: { ...intersectionPoint },
          end: { x: endX, y: Math.max(endY, FLOOR_Y), z: intersectionPoint.z },
          color: disp.color,
          opacity: 1.0,
          lineWidth: 2,
          isDashed: false
        });
      });
    }

    return result;
  }, [lightSource, angles, intersectionPoint]);

  const causticSpots: CausticSpot[] = useMemo(() => {
    if (angles.isTotalReflection) return [];

    const dispersedDirections = calculateDispersedRayDirections(lightSource.incidentAngle);
    const spots: CausticSpot[] = [];

    dispersedDirections.forEach((disp, colorIndex) => {
      const waterDepth = Math.abs(WATER_SURFACE_Y - FLOOR_Y);
      const slopeX = -disp.direction.x / disp.direction.y;
      const floorX = intersectionPoint.x + slopeX * waterDepth;

      const spotsPerColor = Math.floor(MAX_CAUSTIC_SPOTS / SPECTRUM_COLORS.length);
      for (let i = 0; i < spotsPerColor; i++) {
        const randomOffsetX = (Math.random() - 0.5) * 0.5;
        const randomOffsetZ = (Math.random() - 0.5) * 0.5;
        spots.push({
          id: colorIndex * spotsPerColor + i,
          position: {
            x: floorX + randomOffsetX,
            y: FLOOR_Y + 0.01,
            z: intersectionPoint.z + randomOffsetZ
          },
          color: disp.color,
          size: 0.15 + Math.random() * 0.1,
          opacity: 0.5 + Math.random() * 0.3,
          wobblePhase: Math.random() * Math.PI * 2
        });
      }
    });

    return spots;
  }, [angles.isTotalReflection, lightSource.incidentAngle, intersectionPoint]);

  const updateCausticWobble = useCallback((deltaTime: number) => {
    animationTimeRef.current += deltaTime;
  }, []);

  const getWobbledPosition = useCallback((spot: CausticSpot): Vector3 => {
    const t = animationTimeRef.current;
    const wobbleX = Math.sin(t * 2 + spot.wobblePhase) * 0.03;
    const wobbleZ = Math.cos(t * 1.5 + spot.wobblePhase) * 0.03;
    return {
      x: spot.position.x + wobbleX,
      y: spot.position.y,
      z: spot.position.z + wobbleZ
    };
  }, []);

  const setIncidentAngle = useCallback((angle: number) => {
    setLightSource((prev) => ({
      ...prev,
      incidentAngle: Math.max(0, Math.min(90, angle))
    }));
  }, []);

  const setLightPosition = useCallback((position: Vector3) => {
    const clampedX = Math.max(-SCENE_WIDTH / 2, Math.min(SCENE_WIDTH / 2, position.x));
    const clampedY = Math.max(0.1, Math.min(3, position.y));
    setLightSource((prev) => ({
      ...prev,
      position: { x: clampedX, y: clampedY, z: position.z }
    }));
  }, []);

  const resetLight = useCallback(() => {
    setLightSource({
      position: DEFAULT_LIGHT_POSITION,
      incidentAngle: 30,
      intensity: 1.0,
      color: '#ffffff'
    });
    wasTotalReflectionRef.current = false;
    setFlashEffect({
      active: false,
      position: { x: 0, y: 0, z: 0 },
      startTime: 0,
      duration: 500
    });
  }, []);

  const getFlashOpacity = useCallback((): number => {
    if (!flashEffect.active) return 0;
    const elapsed = performance.now() - flashEffect.startTime;
    if (elapsed >= flashEffect.duration) return 0;
    const progress = elapsed / flashEffect.duration;
    return 0.8 * (1 - progress);
  }, [flashEffect]);

  return {
    lightSource,
    angles,
    rays,
    causticSpots,
    intersectionPoint,
    flashEffect,
    setIncidentAngle,
    setLightPosition,
    resetLight,
    updateCausticWobble,
    getWobbledPosition,
    getFlashOpacity,
    animationTimeRef
  };
};
