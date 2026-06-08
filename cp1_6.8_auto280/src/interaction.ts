import * as THREE from 'three';
import { SceneContext } from './scene';
import { ParticleSystem, addRipple, addTempConnection } from './particles';

const RESONANCE_RADIUS = 6;
const CLICK_EXPIRE_MS = 3000;

export interface InteractionState {
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  clickedParticles: number[];
  lastClickTime: number;
}

export function createInteractionState(): InteractionState {
  return {
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    clickedParticles: [],
    lastClickTime: 0,
  };
}

export function setupInteraction(
  ctx: SceneContext,
  system: ParticleSystem,
  state: InteractionState
) {
  const canvas = ctx.renderer.domElement;

  canvas.addEventListener('click', (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.mouse, ctx.camera);

    const meshes = system.particles.map((p) => p.mesh);
    const intersects = state.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const idx = hit.userData.particleIndex as number;
      if (idx === undefined) return;

      triggerResonance(system, idx);

      addRipple(ctx, system, idx);

      const now = Date.now();
      if (now - state.lastClickTime < CLICK_EXPIRE_MS && state.clickedParticles.length > 0) {
        const prevIdx = state.clickedParticles[state.clickedParticles.length - 1];
        if (prevIdx !== idx) {
          addTempConnection(ctx, system, prevIdx, idx);
        }
      }

      state.clickedParticles.push(idx);
      state.lastClickTime = now;

      if (state.clickedParticles.length >= 3) {
        setTimeout(() => {
          burstChain(ctx, system, state.clickedParticles);
          state.clickedParticles = [];
        }, 500);
      }
    }
  });
}

function triggerResonance(system: ParticleSystem, index: number) {
  const target = system.particles[index];
  target.resonance = 1.0;

  for (let i = 0; i < system.particles.length; i++) {
    if (i === index) continue;
    const p = system.particles[i];
    const dist = p.basePosition.distanceTo(target.basePosition);
    if (dist < RESONANCE_RADIUS) {
      const strength = 1 - dist / RESONANCE_RADIUS;
      p.resonance = Math.max(p.resonance, strength);
    }
  }
}

function burstChain(
  ctx: SceneContext,
  system: ParticleSystem,
  indices: number[]
) {
  for (const idx of indices) {
    const p = system.particles[idx];
    p.resonance = 1.5;

    addRipple(ctx, system, idx);
  }

  for (let i = 0; i < indices.length - 1; i++) {
    addTempConnection(ctx, system, indices[i], indices[i + 1]);
  }
  if (indices.length > 2) {
    addTempConnection(ctx, system, indices[indices.length - 1], indices[0]);
  }
}
