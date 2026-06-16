import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MoleculeData,
  AtomElement,
  CPK_COLORS,
  createMolecule,
} from './models';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  moleculeGroup: THREE.Group;
  atomMeshes: Map<number, THREE.Mesh>;
  bondMeshes: Map<number, THREE.Mesh>;
  labelSprites: Map<number, THREE.Sprite>;
  currentMolecule: MoleculeData;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  clipperActive: boolean;
  hoveredAtom: number | null;
  hoveredBond: number | null;
  onBondBroken: ((bondId: number) => void) | null;
  onMoleculeChanged: ((mol: MoleculeData) => void) | null;
  animating: boolean;
}

let ctx: SceneContext | null = null;

export function getSceneContext(): SceneContext | null {
  return ctx;
}

function createBondGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number = 0.05
): { mesh: THREE.Mesh; midpoint: THREE.Vector3; direction: THREE.Vector3; originalLength: number } {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  direction.normalize();
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const geometry = new THREE.CylinderGeometry(radius, radius, length, 6, 1);
  const material = new THREE.MeshPhongMaterial({
    color: 0xb0bec5,
    shininess: 60,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(midpoint);

  const axis = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);
  mesh.quaternion.copy(quaternion);

  return { mesh, midpoint, direction, originalLength: length };
}

function createAtomMesh(atom: { id: number; element: AtomElement; position: [number, number, number] }): THREE.Mesh {
  const radiusMap: Record<AtomElement, number> = {
    [AtomElement.C]: 0.3,
    [AtomElement.H]: 0.2,
    [AtomElement.O]: 0.3,
    [AtomElement.N]: 0.3,
  };
  const radius = radiusMap[atom.element];
  const geometry = new THREE.SphereGeometry(radius, 12, 10);
  const material = new THREE.MeshPhongMaterial({
    color: CPK_COLORS[atom.element],
    shininess: 80,
    specular: 0x444444,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...atom.position);
  mesh.userData = { atomId: atom.id, element: atom.element };

  return mesh;
}

function createLabelSprite(element: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context2d = canvas.getContext('2d')!;
  context2d.clearRect(0, 0, 64, 64);
  context2d.font = 'bold 40px monospace';
  context2d.textAlign = 'center';
  context2d.textBaseline = 'middle';
  context2d.fillStyle = '#ffffff';
  context2d.strokeStyle = '#000000';
  context2d.lineWidth = 3;
  context2d.strokeText(element, 32, 32);
  context2d.fillText(element, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.5, 0.5, 0.5);
  sprite.visible = false;
  return sprite;
}

function buildMolecule(mol: MoleculeData, group: THREE.Group): {
  atomMeshes: Map<number, THREE.Mesh>;
  bondMeshes: Map<number, THREE.Mesh>;
  labelSprites: Map<number, THREE.Sprite>;
} {
  const atomMeshes = new Map<number, THREE.Mesh>();
  const bondMeshes = new Map<number, THREE.Mesh>();
  const labelSprites = new Map<number, THREE.Sprite>();

  const radiusMap: Record<AtomElement, number> = {
    [AtomElement.C]: 0.3,
    [AtomElement.H]: 0.2,
    [AtomElement.O]: 0.3,
    [AtomElement.N]: 0.3,
  };

  for (const atom of mol.atoms) {
    const mesh = createAtomMesh(atom);
    atomMeshes.set(atom.id, mesh);
    group.add(mesh);

    const label = createLabelSprite(atom.element);
    label.position.set(
      atom.position[0],
      atom.position[1] + radiusMap[atom.element] + 0.25,
      atom.position[2]
    );
    labelSprites.set(atom.id, label);
    group.add(label);
  }

  const atomMap = new Map(mol.atoms.map(a => [a.id, a]));

  for (const bond of mol.bonds) {
    if (bond.broken) continue;
    const a1 = atomMap.get(bond.atom1Id);
    const a2 = atomMap.get(bond.atom2Id);
    if (!a1 || !a2) continue;

    const start = new THREE.Vector3(...a1.position);
    const end = new THREE.Vector3(...a2.position);

    const { mesh } = createBondGeometry(start, end, bond.order > 1 ? 0.07 : 0.05);
    mesh.userData = { bondId: bond.id };

    if (bond.order === 2) {
      const dir = new THREE.Vector3().subVectors(end, start).normalize();
      const perp = new THREE.Vector3();
      if (Math.abs(dir.y) < 0.99) {
        perp.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perp.crossVectors(dir, new THREE.Vector3(1, 0, 0)).normalize();
      }
      const offset = perp.multiplyScalar(0.12);
      mesh.position.add(offset);

      const { mesh: mesh2 } = createBondGeometry(start, end, 0.05);
      mesh2.position.sub(offset);
      mesh2.userData = { bondId: bond.id, isSecondBond: true };
      bondMeshes.set(bond.id * 10000 + 1, mesh2);
      group.add(mesh2);
    }

    bondMeshes.set(bond.id, mesh);
    group.add(mesh);
  }

  return { atomMeshes, bondMeshes, labelSprites };
}

export function initScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x263238);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(5, 4, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 2;
  controls.maxDistance = 25;
  controls.enablePan = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight1.position.set(5, 8, 5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight2.position.set(-5, -3, -5);
  scene.add(dirLight2);

  const initialMol = createMolecule('caffeine');
  const moleculeGroup = new THREE.Group();
  scene.add(moleculeGroup);

  const { atomMeshes, bondMeshes, labelSprites } = buildMolecule(initialMol, moleculeGroup);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  ctx = {
    scene,
    camera,
    renderer,
    controls,
    moleculeGroup,
    atomMeshes,
    bondMeshes,
    labelSprites,
    currentMolecule: initialMol,
    raycaster,
    mouse,
    clipperActive: false,
    hoveredAtom: null,
    hoveredBond: null,
    onBondBroken: null,
    onMoleculeChanged: null,
    animating: false,
  };

  let lastHoverUpdate = 0;
  const hoverThrottle = 32;

  function animate(now: number) {
    requestAnimationFrame(animate);
    controls.update();

    if (ctx!.clipperActive && now - lastHoverUpdate > hoverThrottle) {
      lastHoverUpdate = now;
      updateHover();
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  window.addEventListener('resize', () => {
    if (!ctx) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    ctx.camera.aspect = w / h;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(w, h);
  });

  return ctx;
}

function updateHover() {
  if (!ctx) return;

  const prevHoveredAtom = ctx.hoveredAtom;
  const prevHoveredBond = ctx.hoveredBond;

  const radiusMap: Record<AtomElement, number> = {
    [AtomElement.C]: 0.3,
    [AtomElement.H]: 0.2,
    [AtomElement.O]: 0.3,
    [AtomElement.N]: 0.3,
  };

  if (prevHoveredAtom !== null) {
    const prevMesh = ctx.atomMeshes.get(prevHoveredAtom);
    if (prevMesh) {
      (prevMesh.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
      (prevMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0;
    }
    const prevLabel = ctx.labelSprites.get(prevHoveredAtom);
    if (prevLabel) prevLabel.visible = false;
    ctx.hoveredAtom = null;
  }

  if (prevHoveredBond !== null) {
    const prevMesh = ctx.bondMeshes.get(prevHoveredBond);
    if (prevMesh) {
      (prevMesh.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
      (prevMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0;
    }
    ctx.hoveredBond = null;
  }

  const atomArray = Array.from(ctx.atomMeshes.values());
  const bondArray = Array.from(ctx.bondMeshes.values());

  if (ctx.clipperActive) {
    ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
    const bondIntersects = ctx.raycaster.intersectObjects(bondArray);
    if (bondIntersects.length > 0) {
      const bondId = bondIntersects[0].object.userData.bondId as number;
      if (bondId !== undefined) {
        ctx.hoveredBond = bondId;
        const mesh = ctx.bondMeshes.get(bondId);
        if (mesh) {
          (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(0x444444);
          (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5;
        }
      }
    }
  }

  ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
  const atomIntersects = ctx.raycaster.intersectObjects(atomArray);
  if (atomIntersects.length > 0) {
    const atomId = atomIntersects[0].object.userData.atomId as number;
    if (atomId !== undefined) {
      ctx.hoveredAtom = atomId;
      const mesh = ctx.atomMeshes.get(atomId);
      if (mesh) {
        (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(0xffc107);
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.6;
      }
      const label = ctx.labelSprites.get(atomId);
      if (label) label.visible = true;
    }
  }

  ctx.renderer.domElement.style.cursor = ctx.clipperActive
    ? (ctx.hoveredBond !== null ? 'pointer' : 'crosshair')
    : 'grab';
}

export function updateMousePosition(event: MouseEvent) {
  if (!ctx) return;
  const rect = ctx.renderer.domElement.getBoundingClientRect();
  ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

export function switchMolecule(type: string): Promise<void> {
  return new Promise((resolve) => {
    if (!ctx) { resolve(); return; }

    ctx.animating = true;

    const group = ctx.moleculeGroup;
    const startScale = group.scale.x;
    const startTime = performance.now();
    const fadeDuration = 500;

    function fadeOut(time: number) {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / fadeDuration, 1);
      const scale = startScale * (1 - t);
      group.scale.set(scale, scale, scale);
      group.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
          child.material.transparent = true;
          child.material.opacity = 1 - t;
        }
        if (child instanceof THREE.Sprite) {
          child.material.transparent = true;
          child.material.opacity = 1 - t;
        }
      });

      if (t < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        clearMoleculeGroup();
        const newMol = createMolecule(type);
        ctx!.currentMolecule = newMol;

        const { atomMeshes, bondMeshes, labelSprites } = buildMolecule(newMol, group);
        ctx!.atomMeshes = atomMeshes;
        ctx!.bondMeshes = bondMeshes;
        ctx!.labelSprites = labelSprites;

        group.scale.set(0.01, 0.01, 0.01);
        const fadeInStart = performance.now();

        function fadeIn(time2: number) {
          const elapsed2 = time2 - fadeInStart;
          const t2 = Math.min(elapsed2 / fadeDuration, 1);
          const easeT = easeOutCubic(t2);
          const s2 = 0.01 + (1 - 0.01) * easeT;
          group.scale.set(s2, s2, s2);
          group.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
              child.material.transparent = t2 < 1;
              child.material.opacity = t2;
            }
            if (child instanceof THREE.Sprite) {
              child.material.transparent = true;
              child.material.opacity = t2;
            }
          });

          if (t2 < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            ctx!.animating = false;
            if (ctx!.onMoleculeChanged) {
              ctx!.onMoleculeChanged(newMol);
            }
            resolve();
          }
        }
        requestAnimationFrame(fadeIn);
      }
    }

    requestAnimationFrame(fadeOut);
  });
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clearMoleculeGroup() {
  if (!ctx) return;
  const group = ctx.moleculeGroup;
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
    if (child instanceof THREE.Sprite) {
      child.material.map?.dispose();
      child.material.dispose();
    }
    group.remove(child);
  }
  ctx.atomMeshes.clear();
  ctx.bondMeshes.clear();
  ctx.labelSprites.clear();
}

export function removeBondMesh(bondId: number) {
  if (!ctx) return;
  const mesh = ctx.bondMeshes.get(bondId);
  if (mesh) {
    ctx.moleculeGroup.remove(mesh);
    mesh.geometry.dispose();
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
    }
    ctx.bondMeshes.delete(bondId);
  }
  const secondKey = bondId * 10000 + 1;
  const mesh2 = ctx.bondMeshes.get(secondKey);
  if (mesh2) {
    ctx.moleculeGroup.remove(mesh2);
    mesh2.geometry.dispose();
    if (mesh2.material instanceof THREE.Material) {
      mesh2.material.dispose();
    }
    ctx.bondMeshes.delete(secondKey);
  }
}
