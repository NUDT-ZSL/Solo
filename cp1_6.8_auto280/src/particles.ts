import * as THREE from 'three';
import { SceneContext } from './scene';

export interface ParticleData {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  basePosition: THREE.Vector3;
  phase: number;
  speed: number;
  color: THREE.Color;
  resonance: number;
}

export interface ConnectionData {
  line: THREE.Line;
  from: number;
  to: number;
  baseOpacity: number;
  flowOffset: number;
  color: THREE.Color;
}

export interface RippleData {
  ring: THREE.Mesh;
  age: number;
  maxAge: number;
  particleIndex: number;
}

export interface TempConnectionData {
  line: THREE.Line;
  from: number;
  to: number;
  age: number;
  maxAge: number;
  phase: 'grow' | 'burst' | 'done';
}

export interface ParticleSystem {
  particles: ParticleData[];
  connections: ConnectionData[];
  ripples: RippleData[];
  tempConnections: TempConnectionData[];
  settings: ParticleSettings;
}

export interface ParticleSettings {
  count: number;
  connectionDensity: number;
  waveAmplitude: number;
  animationSpeed: number;
}

const PARTICLE_RADIUS = 0.25;
const GLOW_RADIUS = 0.6;
const FIELD_RADIUS = 15;

function randomSpherePoint(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function createParticleMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
  });
}

function createGlowMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
  });
}

export function createParticleSystem(ctx: SceneContext, settings: ParticleSettings): ParticleSystem {
  const system: ParticleSystem = {
    particles: [],
    connections: [],
    ripples: [],
    tempConnections: [],
    settings,
  };

  generateParticles(ctx, system, settings.count);
  generateConnections(ctx, system, settings.connectionDensity);

  return system;
}

function generateParticles(ctx: SceneContext, system: ParticleSystem, count: number) {
  for (const p of system.particles) {
    ctx.particleGroup.remove(p.mesh);
    ctx.particleGroup.remove(p.glow);
    p.mesh.geometry.dispose();
    (p.mesh.material as THREE.Material).dispose();
    p.glow.geometry.dispose();
    (p.glow.material as THREE.Material).dispose();
  }
  system.particles = [];

  const sphereGeo = new THREE.SphereGeometry(PARTICLE_RADIUS, 16, 16);
  const glowGeo = new THREE.SphereGeometry(GLOW_RADIUS, 16, 16);

  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const color = new THREE.Color();
    color.setHSL(0.58 + t * 0.22, 0.85, 0.55 + t * 0.15);

    const pos = randomSpherePoint(FIELD_RADIUS);

    const mat = createParticleMaterial(color);
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.position.copy(pos);
    mesh.userData = { particleIndex: i };
    ctx.particleGroup.add(mesh);

    const glowMat = createGlowMaterial(color);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(pos);
    ctx.particleGroup.add(glow);

    system.particles.push({
      mesh,
      glow,
      basePosition: pos.clone(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.0,
      color: color.clone(),
      resonance: 0,
    });
  }
}

function generateConnections(ctx: SceneContext, system: ParticleSystem, density: number) {
  for (const c of system.connections) {
    ctx.particleGroup.remove(c.line);
    c.line.geometry.dispose();
    (c.line.material as THREE.Material).dispose();
  }
  system.connections = [];

  const maxDist = 5 + density * 3;
  const particles = system.particles;

  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dist = particles[i].basePosition.distanceTo(particles[j].basePosition);
      if (dist < maxDist) {
        const opacity = 1 - dist / maxDist;
        const midColor = new THREE.Color().lerpColors(
          particles[i].color,
          particles[j].color,
          0.5
        );

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          particles[i].mesh.position.clone(),
          particles[j].mesh.position.clone(),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: midColor,
          transparent: true,
          opacity: opacity * 0.4,
          linewidth: 1,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        ctx.particleGroup.add(line);

        system.connections.push({
          line,
          from: i,
          to: j,
          baseOpacity: opacity * 0.4,
          flowOffset: Math.random() * Math.PI * 2,
          color: midColor.clone(),
        });
      }
    }
  }
}

export function rebuildParticles(ctx: SceneContext, system: ParticleSystem, count: number) {
  system.settings.count = count;
  generateParticles(ctx, system, count);
  generateConnections(ctx, system, system.settings.connectionDensity);
}

export function rebuildConnections(ctx: SceneContext, system: ParticleSystem, density: number) {
  system.settings.connectionDensity = density;
  generateConnections(ctx, system, density);
}

export function updateParticleSystem(ctx: SceneContext, system: ParticleSystem, delta: number) {
  const time = ctx.clock.getElapsedTime();
  const speed = system.settings.animationSpeed;
  const amplitude = system.settings.waveAmplitude;

  for (const p of system.particles) {
    const wave = Math.sin(time * p.speed * speed + p.phase) * amplitude * 0.3;
    const waveX = Math.cos(time * p.speed * speed * 0.7 + p.phase + 1.0) * amplitude * 0.2;
    const waveZ = Math.sin(time * p.speed * speed * 0.5 + p.phase + 2.0) * amplitude * 0.2;

    p.mesh.position.set(
      p.basePosition.x + waveX,
      p.basePosition.y + wave,
      p.basePosition.z + waveZ
    );
    p.glow.position.copy(p.mesh.position);

    const pulse = 0.12 + Math.sin(time * 2 * speed + p.phase) * 0.06;
    (p.glow.material as THREE.MeshBasicMaterial).opacity = pulse + p.resonance * 0.3;

    const glowScale = 1 + p.resonance * 0.8 + Math.sin(time * 3 * speed + p.phase) * 0.1;
    p.glow.scale.setScalar(glowScale);

    if (p.resonance > 0) {
      p.resonance = Math.max(0, p.resonance - delta * 0.5);
    }
  }

  for (const c of system.connections) {
    const posArr = c.line.geometry.attributes.position as THREE.BufferAttribute;
    const fromP = system.particles[c.from];
    const toP = system.particles[c.to];
    posArr.setXYZ(0, fromP.mesh.position.x, fromP.mesh.position.y, fromP.mesh.position.z);
    posArr.setXYZ(1, toP.mesh.position.x, toP.mesh.position.y, toP.mesh.position.z);
    posArr.needsUpdate = true;

    const flow = Math.sin(time * speed * 2 + c.flowOffset) * 0.5 + 0.5;
    const resFactor = Math.max(fromP.resonance, toP.resonance);
    const mat = c.line.material as THREE.MeshBasicMaterial;

    if (resFactor > 0) {
      const resColor = new THREE.Color().lerpColors(c.color, new THREE.Color(0xff2200), resFactor);
      mat.color.copy(resColor);
      mat.opacity = c.baseOpacity + resFactor * 0.6;
    } else {
      mat.color.copy(c.color);
      mat.opacity = c.baseOpacity + flow * 0.1;
    }
  }

  for (let i = system.ripples.length - 1; i >= 0; i--) {
    const r = system.ripples[i];
    r.age += delta * speed;
    const t = r.age / r.maxAge;
    if (t >= 1) {
      ctx.particleGroup.remove(r.ring);
      r.ring.geometry.dispose();
      (r.ring.material as THREE.Material).dispose();
      system.ripples.splice(i, 1);
      continue;
    }
    const scale = 1 + t * 8;
    r.ring.scale.setScalar(scale);
    (r.ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.6;
    r.ring.lookAt(ctx.camera.position);
  }

  for (let i = system.tempConnections.length - 1; i >= 0; i--) {
    const tc = system.tempConnections[i];
    tc.age += delta * speed;

    if (tc.phase === 'grow' && tc.age > 0.4) {
      tc.phase = 'burst';
      tc.age = 0;
    }

    if (tc.phase === 'burst') {
      const t = tc.age / 0.6;
      if (t >= 1) {
        tc.phase = 'done';
        ctx.particleGroup.remove(tc.line);
        tc.line.geometry.dispose();
        (tc.line.material as THREE.Material).dispose();
        system.tempConnections.splice(i, 1);
        continue;
      }
      const mat = tc.line.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.9;
      const burstScale = 1 + t * 3;
      tc.line.scale.setScalar(burstScale);
    }

    if (tc.phase === 'grow') {
      const t = tc.age / 0.4;
      const mat = tc.line.material as THREE.MeshBasicMaterial;
      mat.opacity = t * 0.9;
    }
  }
}

export function addRipple(ctx: SceneContext, system: ParticleSystem, particleIndex: number) {
  const p = system.particles[particleIndex];
  const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(p.mesh.position);
  ring.lookAt(ctx.camera.position);
  ctx.particleGroup.add(ring);

  system.ripples.push({
    ring,
    age: 0,
    maxAge: 1.5,
    particleIndex,
  });
}

export function addTempConnection(
  ctx: SceneContext,
  system: ParticleSystem,
  fromIndex: number,
  toIndex: number
) {
  const from = system.particles[fromIndex];
  const to = system.particles[toIndex];
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    from.mesh.position.clone(),
    to.mesh.position.clone(),
  ]);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0,
    linewidth: 2,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  ctx.particleGroup.add(line);

  system.tempConnections.push({
    line,
    from: fromIndex,
    to: toIndex,
    age: 0,
    maxAge: 1.0,
    phase: 'grow',
  });
}
