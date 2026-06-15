import * as THREE from 'three';
import {
  ElementCube,
  ElementData,
  ElementCategory,
  FILTER_CATEGORIES,
  METAL_CATEGORIES,
  CATEGORY_COLORS,
  ELEMENTS,
} from './elements';

export interface ReactionLine {
  line: THREE.Line;
  fromSymbol: string;
  toSymbol: string;
  equation: string;
  midpoint: THREE.Vector3;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface CameraTween {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  progress: number;
  duration: number;
  active: boolean;
}

export const COMMON_REACTIONS: { from: string; to: string; equation: string }[] = [
  { from: 'H', to: 'O', equation: '2H₂ + O₂ → 2H₂O' },
  { from: 'Na', to: 'Cl', equation: '2Na + Cl₂ → 2NaCl' },
  { from: 'Fe', to: 'S', equation: 'Fe + S → FeS' },
  { from: 'C', to: 'O', equation: 'C + O₂ → CO₂' },
  { from: 'Mg', to: 'O', equation: '2Mg + O₂ → 2MgO' },
  { from: 'N', to: 'H', equation: 'N₂ + 3H₂ → 2NH₃' },
  { from: 'Ca', to: 'O', equation: '2Ca + O₂ → 2CaO' },
  { from: 'Al', to: 'O', equation: '4Al + 3O₂ → 2Al₂O₃' },
];

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function createReactionLines(
  elementMap: Map<string, ElementCube>,
  scene: THREE.Scene
): ReactionLine[] {
  const lines: ReactionLine[] = [];

  COMMON_REACTIONS.forEach(reaction => {
    const fromCube = elementMap.get(reaction.from);
    const toCube = elementMap.get(reaction.to);

    if (fromCube && toCube) {
      const points = [fromCube.basePosition.clone(), toCube.basePosition.clone()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: 0x6c7a89,
        dashSize: 0.3,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.6,
        linewidth: 1,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      line.userData.isReactionLine = true;
      line.userData.reactionData = reaction;
      scene.add(line);

      const midpoint = new THREE.Vector3()
        .addVectors(fromCube.basePosition, toCube.basePosition)
        .multiplyScalar(0.5);

      lines.push({
        line,
        fromSymbol: reaction.from,
        toSymbol: reaction.to,
        equation: reaction.equation,
        midpoint,
      });
    }
  });

  return lines;
}

export function createParticle(
  from: THREE.Vector3,
  to: THREE.Vector3,
  speed: number = 4
): Particle {
  const geometry = new THREE.SphereGeometry(0.1, 8, 8);
  const color = new THREE.Color().setHSL(0.08 + Math.random() * 0.08, 1, 0.6);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(from);

  const direction = new THREE.Vector3().subVectors(to, from);
  const distance = direction.length();
  const normalizedDir = direction.normalize();

  return {
    mesh,
    velocity: normalizedDir.multiplyScalar(speed),
    target: to.clone(),
    life: 0,
    maxLife: distance / speed + 0.5,
  };
}

export function updateParticle(particle: Particle, deltaTime: number): boolean {
  particle.life += deltaTime;
  particle.mesh.position.addScaledVector(particle.velocity, deltaTime);

  const distToTarget = particle.mesh.position.distanceTo(particle.target);
  if (distToTarget < 0.3 || particle.life > particle.maxLife) {
    const material = particle.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 1 - (particle.life - particle.maxLife + 0.5) * 4);
    if (material.opacity <= 0) {
      return false;
    }
  }
  return true;
}

export function createFilterBar(
  onFilterChange: (filterKey: string) => void
): void {
  const filterBar = document.getElementById('filterBar');
  if (!filterBar) return;

  filterBar.innerHTML = '';

  FILTER_CATEGORIES.forEach((cat, index) => {
    const tag = document.createElement('div');
    tag.className = 'filter-tag' + (index === 0 ? ' active' : '');
    tag.textContent = cat.label;
    tag.dataset.key = cat.key;
    tag.addEventListener('click', () => {
      document.querySelectorAll('.filter-tag').forEach(t => {
        t.classList.remove('active');
      });
      tag.classList.add('active');
      onFilterChange(cat.key);
    });
    filterBar.appendChild(tag);
  });
}

export function applyFilter(
  cubes: ElementCube[],
  filterKey: string,
  deltaTime: number
): void {
  cubes.forEach(cube => {
    let shouldHighlight = true;

    if (filterKey !== 'all') {
      if (filterKey === 'metal') {
        shouldHighlight = METAL_CATEGORIES.includes(cube.data.category);
      } else {
        shouldHighlight = cube.data.category === filterKey;
      }
    }

    cube.isFiltered = shouldHighlight;

    const material = cube.mesh.material as THREE.MeshStandardMaterial;
    const targetOpacity = shouldHighlight ? 1 : 0.2;
    material.opacity += (targetOpacity - material.opacity) * Math.min(1, deltaTime * 4);

    if (cube.highlightRing && !cube.isSelected) {
      const ringMat = cube.highlightRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity *= 0.9;
    }
  });
}

export function getReactionPartners(element: ElementData): string[] {
  const partners: string[] = [];
  COMMON_REACTIONS.forEach(r => {
    if (r.from === element.symbol) partners.push(r.to);
    if (r.to === element.symbol) partners.push(r.from);
  });
  return partners;
}

export function highlightRingPulse(
  cube: ElementCube,
  time: number,
  flashCount: number = 0
): void {
  if (!cube.highlightRing) return;
  const material = cube.highlightRing.material as THREE.MeshBasicMaterial;

  if (flashCount > 0) {
    const phase = (time * 4) % (Math.PI * 2);
    const pulse = 1 + 0.1 * Math.sin(phase);
    cube.highlightRing.scale.setScalar(pulse);
    material.opacity = 0.8 + 0.2 * Math.sin(phase);
  } else {
    material.opacity = 0;
  }
}

export function updateCameraTween(
  tween: CameraTween,
  camera: THREE.PerspectiveCamera,
  controlsTarget: THREE.Vector3,
  deltaTime: number
): boolean {
  if (!tween.active) return false;

  tween.progress += deltaTime / tween.duration;
  if (tween.progress >= 1) {
    tween.progress = 1;
    tween.active = false;
  }

  const eased = easeInOutCubic(tween.progress);
  camera.position.lerpVectors(tween.startPos, tween.endPos, eased);
  controlsTarget.lerpVectors(tween.startTarget, tween.endTarget, eased);

  return tween.active;
}

export function projectToScreen(
  position: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number
): { x: number; y: number; visible: boolean } {
  const vector = position.clone().project(camera);
  const x = (vector.x * 0.5 + 0.5) * width;
  const y = (-vector.y * 0.5 + 0.5) * height;
  const visible = vector.z < 1 && vector.z > -1;
  return { x, y, visible };
}
