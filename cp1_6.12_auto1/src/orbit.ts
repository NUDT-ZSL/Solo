import * as THREE from 'three';
import { SCENE_CONFIG } from './data/planetData';

export function createOrbitLine(radius: number, color: number = 0x4a6fa5, opacity: number = 0.35): THREE.LineSegments {
  const segments = SCENE_CONFIG.orbitSegments;
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push(x, 0, z);

    if (i < segments) {
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;
      const nx = Math.cos(nextAngle) * radius;
      const nz = Math.sin(nextAngle) * radius;
      positions.push(nx, 0, nz);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });

  const line = new THREE.LineSegments(geometry, material);
  line.userData.isOrbitLine = true;
  return line;
}

export function createAllOrbits(
  scene: THREE.Scene,
  orbitRadii: number[]
): THREE.LineSegments[] {
  const lines: THREE.LineSegments[] = [];
  orbitRadii.forEach((radius) => {
    const line = createOrbitLine(radius);
    scene.add(line);
    lines.push(line);
  });
  return lines;
}
