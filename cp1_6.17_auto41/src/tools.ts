import * as THREE from 'three';
import { SceneContext, getSceneContext, removeBondMesh } from './scene';

interface ParticleState {
  instancedMesh: THREE.InstancedMesh;
  dummy: THREE.Object3D;
  velocities: Float32Array;
  lifes: Float32Array;
  count: number;
  maxCount: number;
  aliveCount: number;
  startTime: number;
  frameId: number | null;
}

export function useClipper() {
  let ctx: SceneContext | null = null;
  let active = false;
  let animatingBondId: number | null = null;
  let onBreakCallback: ((bondId: number, worldPos: THREE.Vector3) => void) | null = null;

  let particleState: ParticleState | null = null;

  function initParticleSystem(scene: THREE.Scene, maxCount: number = 60) {
    const geometry = new THREE.SphereGeometry(0.05, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    instancedMesh.count = 0;
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    particleState = {
      instancedMesh,
      dummy: new THREE.Object3D(),
      velocities: new Float32Array(maxCount * 3),
      lifes: new Float32Array(maxCount),
      count: maxCount,
      maxCount,
      aliveCount: 0,
      startTime: 0,
      frameId: null,
    };
  }

  function enable() {
    ctx = getSceneContext();
    if (!ctx) return;

    if (!particleState) {
      initParticleSystem(ctx.scene, 60);
    }

    active = true;
    ctx.clipperActive = true;
    ctx.renderer.domElement.style.cursor = 'crosshair';
    ctx.renderer.domElement.addEventListener('click', handleClick);
  }

  function disable() {
    ctx = getSceneContext();
    if (!ctx) return;
    active = false;
    ctx.clipperActive = false;
    ctx.renderer.domElement.style.cursor = 'grab';
    ctx.renderer.domElement.removeEventListener('click', handleClick);
  }

  function onBondBreak(cb: (bondId: number, worldPos: THREE.Vector3) => void) {
    onBreakCallback = cb;
  }

  function handleClick(event: MouseEvent) {
    if (!ctx || !active || animatingBondId !== null) return;

    const rect = ctx.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    ctx.raycaster.setFromCamera(mouse, ctx.camera);

    const bondMeshes = Array.from(ctx.bondMeshes.values());
    const intersects = ctx.raycaster.intersectObjects(bondMeshes);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      let bondId: number | null = null;

      if (typeof obj.userData.bondId === 'number') {
        bondId = obj.userData.bondId;
      }

      if (bondId !== null) {
        const bond = ctx.currentMolecule.bonds.find(b => b.id === bondId);
        if (bond && !bond.broken) {
          performBreak(bondId, event.clientX, event.clientY, intersects[0].point.clone());
        }
      }
    }
  }

  function performBreak(bondId: number, clientX: number, clientY: number, worldPos: THREE.Vector3) {
    if (!ctx) return;
    animatingBondId = bondId;

    const bond = ctx.currentMolecule.bonds.find(b => b.id === bondId);
    if (!bond) { animatingBondId = null; return; }
    const targetBond = bond;

    const atomMap = new Map(ctx.currentMolecule.atoms.map(a => [a.id, a]));
    const a1 = atomMap.get(bond.atom1Id);
    const a2 = atomMap.get(bond.atom2Id);
    if (!a1 || !a2) { animatingBondId = null; return; }

    const atom1Id = bond.atom1Id;
    const atom2Id = bond.atom2Id;
    const p1 = new THREE.Vector3(...a1.position);
    const p2 = new THREE.Vector3(...a2.position);
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const bondDirection = new THREE.Vector3().subVectors(p2, p1).normalize();

    const primaryMesh = ctx.bondMeshes.get(bondId);
    const secondKey = bondId * 10000 + 1;
    const secondaryMesh = ctx.bondMeshes.get(secondKey);

    const originalLength = p1.distanceTo(p2);

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    let elapsed = 0;
    const stretchDuration = 200;
    const startTime = performance.now();

    function stretchAnimation(now: number) {
      if (!ctx) return;
      elapsed = now - startTime;
      const t = Math.min(elapsed / stretchDuration, 1);
      const eased = easeInOut(t);
      const scaleFactor = 1 + eased * 1;

      if (primaryMesh && primaryMesh.geometry instanceof THREE.CylinderGeometry) {
        const newLength = originalLength * scaleFactor;
        primaryMesh.scale.set(1, newLength / originalLength, 1);
        (primaryMesh.material as THREE.MeshPhongMaterial).color.setHex(0xE53935);
        (primaryMesh.material as THREE.MeshPhongMaterial).emissive.setHex(0xE53935);
        (primaryMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = eased * 0.5;
      }
      if (secondaryMesh && secondaryMesh.geometry instanceof THREE.CylinderGeometry) {
        const newLength = originalLength * scaleFactor;
        secondaryMesh.scale.set(1, newLength / originalLength, 1);
        (secondaryMesh.material as THREE.MeshPhongMaterial).color.setHex(0xE53935);
        (secondaryMesh.material as THREE.MeshPhongMaterial).emissive.setHex(0xE53935);
        (secondaryMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = eased * 0.5;
      }

      if (t < 1) {
        requestAnimationFrame(stretchAnimation);
      } else {
        spawnParticles(midPoint, 15);
        separateGroups(bondId, bondDirection, atom1Id, atom2Id);

        removeBondMesh(bondId);

        targetBond.broken = true;

        if (ctx.onBondBroken) {
          ctx.onBondBroken(bondId);
        }
        if (onBreakCallback) {
          onBreakCallback(bondId, midPoint.clone());
        }

        animatingBondId = null;
      }
    }

    requestAnimationFrame(stretchAnimation);
  }

  function spawnParticles(origin: THREE.Vector3, count: number) {
    if (!particleState || !ctx) return;

    const ps = particleState;
    const startIdx = ps.aliveCount;
    const spawnCount = Math.min(count, ps.maxCount - ps.aliveCount);

    for (let i = 0; i < spawnCount; i++) {
      const idx = startIdx + i;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(0.5);

      ps.velocities[idx * 3] = dir.x;
      ps.velocities[idx * 3 + 1] = dir.y;
      ps.velocities[idx * 3 + 2] = dir.z;
      ps.lifes[idx] = 0;

      ps.dummy.position.copy(origin);
      ps.dummy.rotation.set(0, 0, 0);
      ps.dummy.scale.set(1, 1, 1);
      ps.dummy.updateMatrix();
      ps.instancedMesh.setMatrixAt(idx, ps.dummy.matrix);
      ps.instancedMesh.setColorAt(idx, new THREE.Color(0xffffff));
    }

    ps.aliveCount += spawnCount;
    ps.instancedMesh.count = ps.aliveCount;
    ps.instancedMesh.instanceMatrix.needsUpdate = true;
    if (ps.instancedMesh.instanceColor) {
      ps.instancedMesh.instanceColor.needsUpdate = true;
    }

    if (!ps.frameId) {
      ps.startTime = performance.now();
      animateParticles(performance.now());
    }
  }

  function animateParticles(currentTime: number) {
    if (!particleState || !ctx) return;

    const ps = particleState;
    const delta = 0.016;
    const maxLife = 0.3;

    let aliveIdx = 0;
    for (let i = 0; i < ps.aliveCount; i++) {
      ps.lifes[i] += delta;

      if (ps.lifes[i] >= maxLife) {
        continue;
      }

      if (aliveIdx !== i) {
        ps.velocities[aliveIdx * 3] = ps.velocities[i * 3];
        ps.velocities[aliveIdx * 3 + 1] = ps.velocities[i * 3 + 1];
        ps.velocities[aliveIdx * 3 + 2] = ps.velocities[i * 3 + 2];
        ps.lifes[aliveIdx] = ps.lifes[i];
      }

      const t = ps.lifes[aliveIdx] / maxLife;
      const opacity = 1 - t;

      ps.dummy.position.x += ps.velocities[aliveIdx * 3] * delta;
      ps.dummy.position.y += ps.velocities[aliveIdx * 3 + 1] * delta;
      ps.dummy.position.z += ps.velocities[aliveIdx * 3 + 2] * delta;
      ps.dummy.rotation.set(0, 0, 0);
      const scale = 0.8 + 0.2 * opacity;
      ps.dummy.scale.set(scale, scale, scale);
      ps.dummy.updateMatrix();
      ps.instancedMesh.setMatrixAt(aliveIdx, ps.dummy.matrix);
      ps.instancedMesh.setColorAt(aliveIdx, new THREE.Color().setRGB(opacity, opacity, opacity));

      aliveIdx++;
    }

    ps.aliveCount = aliveIdx;
    ps.instancedMesh.count = Math.max(0, aliveIdx);
    ps.instancedMesh.instanceMatrix.needsUpdate = true;
    if (ps.instancedMesh.instanceColor) {
      ps.instancedMesh.instanceColor.needsUpdate = true;
    }

    if (aliveIdx > 0) {
      ps.frameId = requestAnimationFrame(animateParticles);
    } else {
      ps.frameId = null;
    }
  }

  function separateGroups(
    bondId: number,
    bondDirection: THREE.Vector3,
    atom1Id: number,
    atom2Id: number
  ) {
    if (!ctx) return;

    const mol = ctx.currentMolecule;
    const atomMap = new Map(mol.atoms.map(a => [a.id, a]));

    const group1 = new Set<number>();
    const group2 = new Set<number>();

    const activeBonds = mol.bonds.filter(b => !b.broken);

    function traverse(startId: number, visited: Set<number>) {
      const queue = [startId];
      visited.add(startId);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const b of activeBonds) {
          if (b.id === bondId) continue;
          let next: number | null = null;
          if (b.atom1Id === current) next = b.atom2Id;
          else if (b.atom2Id === current) next = b.atom1Id;
          if (next !== null && !visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
    }

    traverse(atom1Id, group1);
    traverse(atom2Id, group2);

    const offset = bondDirection.clone().multiplyScalar(0.5);
    const startTime = performance.now();
    const duration = 400;

    const radiusMap: Record<string, number> = { C: 0.3, H: 0.2, O: 0.3, N: 0.3 };

    function easeOutQuad(t: number) { return 1 - (1 - t) * (1 - t); }

    function animate(now: number) {
      if (!ctx) return;
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(t);

      for (const id of group1) {
        const mesh = ctx.atomMeshes.get(id);
        if (mesh) {
          const atom = atomMap.get(id)!;
          mesh.position.set(
            atom.position[0] + offset.x * eased,
            atom.position[1] + offset.y * eased,
            atom.position[2] + offset.z * eased
          );
        }
        const label = ctx.labelSprites.get(id);
        if (label) {
          const atom = atomMap.get(id)!;
          const r = radiusMap[atom.element] ?? 0.3;
          label.position.set(
            atom.position[0] + offset.x * eased,
            atom.position[1] + offset.y * eased + r + 0.25,
            atom.position[2] + offset.z * eased
          );
        }
      }

      for (const id of group2) {
        const mesh = ctx.atomMeshes.get(id);
        if (mesh) {
          const atom = atomMap.get(id)!;
          mesh.position.set(
            atom.position[0] - offset.x * eased,
            atom.position[1] - offset.y * eased,
            atom.position[2] - offset.z * eased
          );
        }
        const label = ctx.labelSprites.get(id);
        if (label) {
          const atom = atomMap.get(id)!;
          const r = radiusMap[atom.element] ?? 0.3;
          label.position.set(
            atom.position[0] - offset.x * eased,
            atom.position[1] - offset.y * eased + r + 0.25,
            atom.position[2] - offset.z * eased
          );
        }
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  return {
    enable,
    disable,
    onBondBreak,
    isActive: () => active,
    animating: () => animatingBondId !== null,
  };
}

export function createFloatingText(
  container: HTMLElement,
  startClientX: number,
  startClientY: number,
  text: string = '+1'
) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = [
    'position: fixed',
    `left: ${startClientX}px`,
    `top: ${startClientY}px`,
    'color: #90CAF9',
    'font-size: 24px',
    'font-weight: bold',
    'pointer-events: none',
    'z-index: 10000',
    'text-shadow: 0 0 8px rgba(144, 202, 249, 0.8)',
    'font-family: monospace, sans-serif',
    'transform: translate(-50%, -50%)',
    'opacity: 1',
    'will-change: transform, opacity',
    'transition: transform 5s cubic-bezier(0.16, 1, 0.3, 1), opacity 5s ease-out',
  ].join(';');

  container.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = `translate(-50%, calc(-50% - 80px))`;
      el.style.opacity = '0';
    });
  });

  setTimeout(() => {
    if (el.parentElement) {
      el.parentElement.removeChild(el);
    }
  }, 5100);
}
