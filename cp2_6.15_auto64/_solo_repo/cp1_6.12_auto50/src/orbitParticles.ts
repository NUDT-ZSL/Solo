import * as THREE from 'three';
import type { PlanetData } from './starSystem';

export interface OrbitParticlesManager {
  group: THREE.Group;
  update: (planets: PlanetData[]) => void;
  setVisible: (visible: boolean) => void;
  setParticleCount: (count: number) => void;
  getParticleCount: () => number;
  reduceParticles: () => void;
}

interface PlanetTrail {
  points: THREE.Points;
  positions: Float32Array;
  colors: Float32Array;
  maxParticles: number;
  currentCount: number;
  lastPosition: THREE.Vector3;
}

function createPlanetTrail(planet: PlanetData, maxParticles: number): PlanetTrail {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 3);
  const alphas = new Float32Array(maxParticles);

  const color = new THREE.Color(planet.color);
  for (let i = 0; i < maxParticles; i++) {
    const i3 = i * 3;
    positions[i3] = 0;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = 0;
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    alphas[i] = 0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  (points.material as THREE.PointsMaterial).onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       attribute float alpha;
       varying float vAlpha;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vAlpha = alpha;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying float vAlpha;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      'vec4 diffuseColor = vec4( diffuse, opacity * vAlpha );'
    );
  };

  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  return {
    points,
    positions,
    colors,
    maxParticles,
    currentCount: 0,
    lastPosition: new THREE.Vector3()
  };
}

export function createOrbitParticles(planets: PlanetData[]): OrbitParticlesManager {
  const group = new THREE.Group();
  let maxParticles = 100;
  const trails: PlanetTrail[] = [];

  planets.forEach((planet) => {
    const trail = createPlanetTrail(planet, maxParticles);
    trails.push(trail);
    group.add(trail.points);
  });

  const updateTrail = (trail: PlanetTrail, position: THREE.Vector3) => {
    const dist = trail.lastPosition.distanceTo(position);
    if (dist < 0.05) return;

    for (let i = trail.maxParticles - 1; i > 0; i--) {
      const i3 = i * 3;
      const prev3 = (i - 1) * 3;
      trail.positions[i3] = trail.positions[prev3];
      trail.positions[i3 + 1] = trail.positions[prev3 + 1];
      trail.positions[i3 + 2] = trail.positions[prev3 + 2];
    }

    trail.positions[0] = position.x;
    trail.positions[1] = position.y;
    trail.positions[2] = position.z;

    const alphaAttr = trail.points.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    for (let i = 0; i < trail.maxParticles; i++) {
      (alphaAttr.array as Float32Array)[i] = Math.max(0, 1 - i / trail.maxParticles);
    }
    alphaAttr.needsUpdate = true;

    (trail.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    if (trail.currentCount < trail.maxParticles) {
      trail.currentCount++;
    }
    trail.lastPosition.copy(position);
  };

  const update = (planets: PlanetData[]) => {
    planets.forEach((planet, index) => {
      const worldPos = new THREE.Vector3();
      planet.mesh.getWorldPosition(worldPos);
      updateTrail(trails[index], worldPos);
    });
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
  };

  const rebuildTrails = () => {
    trails.forEach((trail, index) => {
      group.remove(trail.points);
      trail.points.geometry.dispose();
      (trail.points.material as THREE.Material).dispose();

      const newTrail = createPlanetTrail(planets[index], maxParticles);
      trails[index] = newTrail;
      group.add(newTrail.points);
    });
  };

  const setParticleCount = (count: number) => {
    maxParticles = count;
    rebuildTrails();
  };

  const getParticleCount = () => maxParticles;

  const reduceParticles = () => {
    if (maxParticles > 50) {
      setParticleCount(50);
    }
  };

  return { group, update, setVisible, setParticleCount, getParticleCount, reduceParticles };
}
