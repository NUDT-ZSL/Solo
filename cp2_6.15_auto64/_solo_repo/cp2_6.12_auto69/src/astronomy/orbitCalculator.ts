import * as THREE from 'three';
import { PlanetData, planetsData } from './planetData';

export interface OrbitPosition {
  planetId: string;
  position: THREE.Vector3;
  angle: number;
}

const ECCENTRICITY = 0.05;
const ORBIT_INCLINATION = 0.08;

export const calculateOrbitPosition = (
  planet: PlanetData,
  time: number,
  speedMultiplier: number = 1
): OrbitPosition => {
  if (planet.orbitPeriod === 0) {
    return {
      planetId: planet.id,
      position: new THREE.Vector3(0, 0, 0),
      angle: 0,
    };
  }

  const angularSpeed = (2 * Math.PI) / (planet.orbitPeriod * 1000);
  const angle = angularSpeed * time * speedMultiplier;

  const a = planet.orbitRadius;
  const b = a * Math.sqrt(1 - ECCENTRICITY * ECCENTRICITY);

  const x = a * Math.cos(angle);
  const z = b * Math.sin(angle);

  const y = z * Math.sin(ORBIT_INCLINATION) * 0.3;
  const adjustedZ = z * Math.cos(ORBIT_INCLINATION);

  return {
    planetId: planet.id,
    position: new THREE.Vector3(x, y, adjustedZ),
    angle,
  };
};

export const calculateAllOrbitPositions = (
  time: number,
  speedMultiplier: number = 1
): OrbitPosition[] => {
  return planetsData.map(planet => calculateOrbitPosition(planet, time, speedMultiplier));
};

export const generateOrbitPoints = (planet: PlanetData, segments: number = 128): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const a = planet.orbitRadius;
  const b = a * Math.sqrt(1 - ECCENTRICITY * ECCENTRICITY);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const x = a * Math.cos(angle);
    const z = b * Math.sin(angle);
    const y = z * Math.sin(ORBIT_INCLINATION) * 0.3;
    const adjustedZ = z * Math.cos(ORBIT_INCLINATION);
    points.push(new THREE.Vector3(x, y, adjustedZ));
  }

  return points;
};

export const getInitialCameraPosition = (): { position: THREE.Vector3; target: THREE.Vector3 } => {
  return {
    position: new THREE.Vector3(0, 40, 50),
    target: new THREE.Vector3(0, 0, 0),
  };
};

export const getPlanetFocusPosition = (
  planetPosition: THREE.Vector3,
  planetRadius: number
): { position: THREE.Vector3; target: THREE.Vector3 } => {
  const distance = planetRadius * 4 + 4;
  const offset = new THREE.Vector3(distance * 0.6, distance * 0.4, distance);
  return {
    position: planetPosition.clone().add(offset),
    target: planetPosition.clone(),
  };
};
