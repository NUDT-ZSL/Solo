import * as THREE from 'three';
import type { PlanetObject, MoonObject } from './PlanetSystem';
import { updateHighlightRing } from './PlanetSystem';

export interface AnimationState {
  isRunning: boolean;
  timeScale: number;
  selectedId: string | null;
}

interface AnimationContext {
  planets: PlanetObject[];
  state: AnimationState;
  onFPSUpdate?: (fps: number) => void;
}

let animationFrameId: number | null = null;
let lastTime = performance.now();
let frameCount = 0;
let fpsUpdateTimer = 0;

const BASE_ORBIT_SPEED = 0.0008;
const BASE_ROTATION_SPEED = 0.002;

function updatePlanetOrbit(planet: PlanetObject, deltaTime: number, timeScale: number): void {
  if (planet.data.id === 'sun') {
    const data = planet.data as { rotationSpeed: number };
    planet.mesh.rotation.y += data.rotationSpeed * deltaTime * timeScale;
    return;
  }

  const orbitSpeed = BASE_ORBIT_SPEED / Math.sqrt(planet.data.orbitRadius / 20);
  planet.currentAngle += orbitSpeed * deltaTime * timeScale;

  const x = Math.cos(planet.currentAngle) * planet.parentOrbitRadius;
  const z = Math.sin(planet.currentAngle) * planet.parentOrbitRadius;

  planet.group.position.x = x;
  planet.group.position.z = z;

  if ('rotationSpeed' in planet.data) {
    planet.mesh.rotation.y += planet.data.rotationSpeed * deltaTime * timeScale * BASE_ROTATION_SPEED * 60;
  } else {
    planet.mesh.rotation.y += 0.002 * deltaTime * timeScale;
  }
}

function updateMoonOrbit(
  moon: MoonObject,
  _parentPosition: { x: number; y: number; z: number },
  deltaTime: number,
  timeScale: number
): void {
  const orbitSpeed = BASE_ORBIT_SPEED * 2.5 / Math.sqrt(moon.data.orbitRadius);
  moon.currentAngle += orbitSpeed * deltaTime * timeScale;

  const x = Math.cos(moon.currentAngle) * moon.data.orbitRadius;
  const z = Math.sin(moon.currentAngle) * moon.data.orbitRadius;

  moon.group.position.x = x;
  moon.group.position.z = z;

  moon.mesh.rotation.y += 0.002 * deltaTime * timeScale;
}

function findHighlightRing(
  planets: PlanetObject[],
  id: string
): { ring: THREE.Mesh | null; data: unknown } | null {
  for (const planet of planets) {
    if (planet.id === id) {
      return { ring: planet.highlightRing, data: planet.data };
    }
    for (const moon of planet.moons) {
      if (moon.id === id) {
        return { ring: moon.highlightRing, data: moon.data };
      }
    }
  }
  return null;
}

export function startAnimation(context: AnimationContext): () => void {
  const { planets, state, onFPSUpdate } = context;
  state.isRunning = true;
  lastTime = performance.now();

  const animate = () => {
    if (!state.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    frameCount++;
    fpsUpdateTimer += deltaTime;
    if (fpsUpdateTimer >= 500) {
      const fps = Math.round((frameCount * 1000) / fpsUpdateTimer);
      onFPSUpdate?.(fps);
      frameCount = 0;
      fpsUpdateTimer = 0;
    }

    const timeInSeconds = currentTime * 0.001;

    const updateSunHalo = (window as unknown as { updateSunHalo?: (time: number) => void })
      .updateSunHalo;
    if (updateSunHalo) {
      updateSunHalo(timeInSeconds);
    }

    for (const planet of planets) {
      updatePlanetOrbit(planet, deltaTime, state.timeScale);

      const isPlanetSelected = state.selectedId === planet.id;
      updateHighlightRing(planet.highlightRing, isPlanetSelected, timeInSeconds);

      for (const moon of planet.moons) {
        const parentWorldPos = planet.mesh.getWorldPosition({ x: 0, y: 0, z: 0 } as any);
        updateMoonOrbit(moon, parentWorldPos, deltaTime, state.timeScale);

        const isMoonSelected = state.selectedId === moon.id;
        updateHighlightRing(moon.highlightRing, isMoonSelected, timeInSeconds);
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);

  return () => {
    state.isRunning = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };
}

export function setTimeScale(state: AnimationState, scale: number): void {
  state.timeScale = Math.max(0, Math.min(10, scale));
}

export function setSelectedObject(
  state: AnimationState,
  id: string | null,
  planets: PlanetObject[]
): void {
  const timeInSeconds = performance.now() * 0.001;

  if (state.selectedId) {
    const prev = findHighlightRing(planets, state.selectedId);
    if (prev) {
      updateHighlightRing(prev.ring, false, timeInSeconds);
    }
  }

  state.selectedId = id;

  if (id) {
    const current = findHighlightRing(planets, id);
    if (current) {
      updateHighlightRing(current.ring, true, timeInSeconds);
    }
  }
}

export function createAnimationState(initialTimeScale: number = 1): AnimationState {
  return {
    isRunning: false,
    timeScale: initialTimeScale,
    selectedId: null,
  };
}
