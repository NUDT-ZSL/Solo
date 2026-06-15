import * as THREE from 'three';
import { SceneContext } from './sceneSetup';
import { GrowthState, markBranchExploded } from './crystalGrowth';

export interface FragmentParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  initialSize: number;
  life: number;
  maxLife: number;
  trail: THREE.Vector3[];
  trailLength: number;
  active: boolean;
}

export interface InteractionState {
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  dragThreshold: number;
  hasDragged: boolean;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  particles: FragmentParticle[];
  particleGroup: THREE.Group;
  particleMeshMap: Map<number, THREE.Points>;
  nextParticleId: number;
  maxParticles: number;
}

const ROTATION_SPEED = 0.5 * Math.PI / 180;
const ZOOM_SPEED = 0.1;
const MIN_PARTICLES = 30;
const MAX_PARTICLES = 50;
const MAX_TOTAL_PARTICLES = 200;
const PARTICLE_LIFETIME = 2.0;
const FRAGMENT_INITIAL_SIZE = 0.05;
const TRAIL_LENGTH = 0.2;

export function createInteractionState(scene: THREE.Scene): InteractionState {
  const particleGroup = new THREE.Group();
  scene.add(particleGroup);

  return {
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    dragThreshold: 5,
    hasDragged: false,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    particles: [],
    particleGroup,
    particleMeshMap: new Map(),
    nextParticleId: 0,
    maxParticles: MAX_TOTAL_PARTICLES
  };
}

export function setupInteractionHandlers(
  ctx: SceneContext,
  interaction: InteractionState,
  growthState: GrowthState,
  onBranchExplode?: (nodeIds: number[]) => void
): void {
  const canvas = ctx.renderer.domElement;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      interaction.isDragging = true;
      interaction.lastMouseX = e.clientX;
      interaction.lastMouseY = e.clientY;
      interaction.hasDragged = false;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!interaction.isDragging) return;

    const dx = e.clientX - interaction.lastMouseX;
    const dy = e.clientY - interaction.lastMouseY;

    if (!interaction.hasDragged) {
      const totalDist = Math.sqrt(dx * dx + dy * dy);
      if (totalDist > interaction.dragThreshold) {
        interaction.hasDragged = true;
      }
    }

    if (interaction.hasDragged) {
      ctx.targetCameraYaw -= dx * ROTATION_SPEED;
      ctx.targetCameraPitch += dy * ROTATION_SPEED;
      ctx.targetCameraPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, ctx.targetCameraPitch));
    }

    interaction.lastMouseX = e.clientX;
    interaction.lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0 && interaction.isDragging) {
      if (!interaction.hasDragged) {
        handleClick(ctx, interaction, growthState, e.clientX, e.clientY, onBranchExplode);
      }
      interaction.isDragging = false;
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 1 : -1;
    const currentZoom = ctx.targetCameraDistance;
    ctx.targetCameraDistance = Math.max(0.5, Math.min(5.0, currentZoom + zoomDelta * ZOOM_SPEED));
  }, { passive: false });
}

function handleClick(
  ctx: SceneContext,
  interaction: InteractionState,
  growthState: GrowthState,
  clientX: number,
  clientY: number,
  onBranchExplode?: (nodeIds: number[]) => void
): void {
  const rect = ctx.renderer.domElement.getBoundingClientRect();
  interaction.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  interaction.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  interaction.raycaster.setFromCamera(interaction.mouse, ctx.camera);

  const branchMeshes: THREE.Object3D[] = [];
  for (const mesh of ctx.branchMeshes.values()) {
    branchMeshes.push(mesh);
  }

  const intersects = interaction.raycaster.intersectObjects(branchMeshes, false);

  if (intersects.length > 0) {
    const hitObject = intersects[0].object;
    const nodeId = hitObject.userData.nodeId as number;

    if (nodeId !== undefined) {
      const node = growthState.nodes.get(nodeId);
      if (node && !node.isExploded) {
        const explodedIds = markBranchExploded(growthState, nodeId);
        
        createExplosionParticles(interaction, growthState, explodedIds);
        
        if (onBranchExplode) {
          onBranchExplode(explodedIds);
        }
      }
    }
  }
}

function createExplosionParticles(
  interaction: InteractionState,
  growthState: GrowthState,
  explodedIds: number[]
): void {
  for (const nodeId of explodedIds) {
    const node = growthState.nodes.get(nodeId);
    if (!node) continue;

    const particleCount = Math.floor(Math.random() * (MAX_PARTICLES - MIN_PARTICLES + 1)) + MIN_PARTICLES;
    const explosionCenter = new THREE.Vector3().addVectors(node.start, node.end).multiplyScalar(0.5);
    const segmentLength = node.start.distanceTo(node.end);

    for (let i = 0; i < particleCount; i++) {
      if (interaction.particles.filter(p => p.active).length >= interaction.maxParticles) break;

      const t = Math.random();
      const spawnPos = new THREE.Vector3().lerpVectors(node.start, node.end, t);
      spawnPos.add(new THREE.Vector3(
        (Math.random() - 0.5) * node.thickness,
        (Math.random() - 0.5) * node.thickness,
        (Math.random() - 0.5) * node.thickness
      ));

      const dirFromCenter = new THREE.Vector3().subVectors(spawnPos, explosionCenter);
      if (dirFromCenter.lengthSq() < 0.001) {
        dirFromCenter.set(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        );
      }
      dirFromCenter.normalize();

      const randomDir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      
      const finalDir = dirFromCenter.clone().add(randomDir.multiplyScalar(0.3)).normalize();
      const speed = 1.0 + Math.random() * 1.0;
      const velocity = finalDir.multiplyScalar(speed);

      const particleColor = node.color.clone();
      particleColor.r = Math.min(1, particleColor.r + (Math.random() - 0.3) * 0.2);
      particleColor.g = Math.min(1, particleColor.g + (Math.random() - 0.3) * 0.2);
      particleColor.b = Math.min(1, particleColor.b + (Math.random() - 0.3) * 0.2);

      const sizeVariation = 0.8 + Math.random() * 0.4;

      const particle: FragmentParticle = {
        id: interaction.nextParticleId++,
        position: spawnPos.clone(),
        velocity,
        color: particleColor,
        size: FRAGMENT_INITIAL_SIZE * sizeVariation,
        initialSize: FRAGMENT_INITIAL_SIZE * sizeVariation,
        life: PARTICLE_LIFETIME,
        maxLife: PARTICLE_LIFETIME,
        trail: [spawnPos.clone()],
        trailLength: TRAIL_LENGTH + segmentLength * 0.3,
        active: true
      };

      interaction.particles.push(particle);
    }
  }
}

function createParticleMesh(particle: FragmentParticle): THREE.Points {
  const totalPoints = Math.ceil(particle.trailLength / 0.01) + 1;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(totalPoints * 3);
  const colors = new Float32Array(totalPoints * 3);
  const sizes = new Float32Array(totalPoints);
  const opacities = new Float32Array(totalPoints);

  for (let i = 0; i < totalPoints; i++) {
    const i3 = i * 3;
    positions[i3] = particle.position.x;
    positions[i3 + 1] = particle.position.y;
    positions[i3 + 2] = particle.position.z;

    colors[i3] = particle.color.r;
    colors[i3 + 1] = particle.color.g;
    colors[i3 + 2] = particle.color.b;

    sizes[i] = particle.size;
    opacities[i] = 0.8;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('customSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float customSize;
      attribute float opacity;
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vColor = color;
        vOpacity = opacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = customSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * vOpacity;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.userData = { particleId: particle.id };
  return points;
}

export function updateParticles(interaction: InteractionState, deltaTime: number): number {
  const gravity = new THREE.Vector3(0, -0.5, 0);
  const drag = 0.98;
  let activeCount = 0;

  for (const particle of interaction.particles) {
    if (!particle.active) continue;

    particle.life -= deltaTime;

    if (particle.life <= 0) {
      particle.active = false;
      const mesh = interaction.particleMeshMap.get(particle.id);
      if (mesh) {
        interaction.particleGroup.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        interaction.particleMeshMap.delete(particle.id);
      }
      continue;
    }

    activeCount++;

    particle.velocity.add(gravity.clone().multiplyScalar(deltaTime));
    particle.velocity.multiplyScalar(drag);
    particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

    const lifeRatio = particle.life / particle.maxLife;
    particle.size = particle.initialSize * lifeRatio;

    particle.trail.unshift(particle.position.clone());
    const maxTrailPoints = Math.ceil(particle.trailLength / 0.01) + 1;
    while (particle.trail.length > maxTrailPoints) {
      particle.trail.pop();
    }

    updateParticleMesh(interaction, particle);
  }

  if (interaction.particles.length > interaction.maxParticles * 1.5) {
    interaction.particles = interaction.particles.filter(p => p.active);
  }

  return activeCount;
}

function updateParticleMesh(interaction: InteractionState, particle: FragmentParticle): void {
  let mesh = interaction.particleMeshMap.get(particle.id);

  if (!mesh) {
    mesh = createParticleMesh(particle);
    interaction.particleMeshMap.set(particle.id, mesh);
    interaction.particleGroup.add(mesh);
  }

  const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
  const sizes = mesh.geometry.getAttribute('customSize') as THREE.BufferAttribute;
  const opacities = mesh.geometry.getAttribute('opacity') as THREE.BufferAttribute;

  const totalPoints = positions.count;
  const trailLength = particle.trail.length;

  for (let i = 0; i < totalPoints; i++) {
    const i3 = i * 3;
    const t = i / Math.max(1, totalPoints - 1);

    let point: THREE.Vector3;
    if (i < trailLength) {
      point = particle.trail[i];
    } else if (trailLength > 0) {
      point = particle.trail[trailLength - 1];
    } else {
      point = particle.position;
    }

    positions.array[i3] = point.x;
    positions.array[i3 + 1] = point.y;
    positions.array[i3 + 2] = point.z;

    const fadeFactor = 1.0 - t;
    const lifeRatio = particle.life / particle.maxLife;
    const alpha = 0.8 * fadeFactor * lifeRatio;

    (opacities.array as Float32Array)[i] = alpha;

    const colorBoost = 1.0 + (1.0 - lifeRatio) * 0.5;
    (colors.array as Float32Array)[i3] = Math.min(1, particle.color.r * colorBoost);
    (colors.array as Float32Array)[i3 + 1] = Math.min(1, particle.color.g * colorBoost);
    (colors.array as Float32Array)[i3 + 2] = Math.min(1, particle.color.b * colorBoost);

    (sizes.array as Float32Array)[i] = particle.size * fadeFactor;
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;
  sizes.needsUpdate = true;
  opacities.needsUpdate = true;
}

export function getActiveParticleCount(interaction: InteractionState): number {
  return interaction.particles.filter(p => p.active).length;
}

export function disposeInteraction(interaction: InteractionState): void {
  for (const particle of interaction.particles) {
    particle.active = false;
  }

  for (const [id, mesh] of interaction.particleMeshMap) {
    interaction.particleGroup.remove(mesh);
    mesh.geometry.dispose();
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
    }
    interaction.particleMeshMap.delete(id);
  }

  interaction.particles = [];
  interaction.particleMeshMap.clear();
}
