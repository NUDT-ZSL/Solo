import * as THREE from 'three';
import { SceneContext, getSceneContext, removeBondMesh } from './scene';

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function useClipper() {
  let ctx: SceneContext | null = null;
  let particles: Particle[] = [];
  let active = false;
  let animatingBondId: number | null = null;
  let onBreakCallback: ((bondId: number, worldPos: THREE.Vector3) => void) | null = null;

  function enable() {
    ctx = getSceneContext();
    if (!ctx) return;
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
        spawnParticles(midPoint);
        separateGroups(bondId, bondDirection, atom1Id, atom2Id);

        removeBondMesh(bondId);

        bond.broken = true;

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

  function spawnParticles(origin: THREE.Vector3) {
    if (!ctx) return;

    const particleCount = 15;
    const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });

    for (let i = 0; i < particleCount; i++) {
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = 0.5;
      const mesh = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      mesh.position.copy(origin);

      ctx.scene.add(mesh);

      particles.push({
        mesh,
        velocity: direction.multiplyScalar(speed),
        life: 0,
        maxLife: 0.3,
      });
    }

    animateParticles();
  }

  let particleAnimFrame: number | null = null;
  let lastParticleTime = 0;

  function animateParticles(currentTime?: number) {
    if (!ctx) return;

    const now = currentTime ?? performance.now();
    const delta = lastParticleTime ? (now - lastParticleTime) / 1000 : 0.016;
    lastParticleTime = now;

    particles = particles.filter(p => {
      p.life += delta;
      if (p.life >= p.maxLife) {
        ctx!.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        return false;
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));

      const t = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      return true;
    });

    if (particles.length > 0) {
      particleAnimFrame = requestAnimationFrame(animateParticles);
    } else {
      particleAnimFrame = null;
      lastParticleTime = 0;
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
          const r = 0.3;
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
          const r = 0.3;
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
  el.style.position = 'fixed';
  el.style.left = `${startClientX}px`;
  el.style.top = `${startClientY}px`;
  el.style.color = '#90CAF9';
  el.style.fontSize = '24px';
  el.style.fontWeight = 'bold';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '10000';
  el.style.textShadow = '0 0 8px rgba(144, 202, 249, 0.8)';
  el.style.fontFamily = 'monospace, sans-serif';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.transition = 'all 5s ease-out';

  container.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transform = 'translate(-50%, -50%)';
    requestAnimationFrame(() => {
      el.style.top = `${startClientY - 80}px`;
      el.style.opacity = '0';
    });
  });

  setTimeout(() => {
    if (el.parentElement) {
      el.parentElement.removeChild(el);
    }
  }, 5100);
}
