import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Plant, EnvironmentState } from './plant';
import {
  createPotAndSoil,
  createLightSource,
  createStarfield,
  updateLightParticles,
  updateStarfield
} from './scene';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let plant: Plant;
let lightSource: {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  particles: THREE.Points;
};
let starfield: THREE.Points;

const environment: EnvironmentState = {
  lightIntensity: 1.0,
  soilMoisture: 60,
  lightPosition: new THREE.Vector3(5, 5, 3)
};

let isDraggingLight: boolean = false;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let dragOffset = new THREE.Vector3();
let dragStartY: number = 0;

const clock = new THREE.Clock();

function init(): void {
  const container = document.getElementById('scene-container');
  if (!container) {
    console.error('Scene container not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#1A1A2E');
  scene.fog = new THREE.Fog('#1A1A2E', 15, 40);

  const rect = container.getBoundingClientRect();
  camera = new THREE.PerspectiveCamera(50, rect.width / rect.height, 0.1, 100);
  camera.position.set(6, 5, 8);
  camera.lookAt(0, 2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(rect.width, rect.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 2, 0);
  controls.mouseButtons = {
    LEFT: null as any,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  };
  controls.touches = {
    ONE: null as any,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x606080, 0x202030, 0.4);
  scene.add(hemiLight);

  const { pot, soil, shadow } = createPotAndSoil();
  scene.add(pot);
  scene.add(soil);
  scene.add(shadow);

  plant = new Plant();
  plant.group.position.y = 2.0;
  scene.add(plant.group);

  lightSource = createLightSource();
  scene.add(lightSource.mesh);
  scene.add(lightSource.light);
  scene.add(lightSource.particles);
  environment.lightPosition.copy(lightSource.mesh.position);

  starfield = createStarfield();
  scene.add(starfield);

  bindUIEvents();
  bindInteractionEvents(container);
  bindResizeEvents(container);

  animate();
}

function bindUIEvents(): void {
  const lightSlider = document.getElementById('light-slider') as HTMLInputElement;
  const lightValue = document.getElementById('light-value') as HTMLSpanElement;
  const lightPopup = document.getElementById('light-popup') as HTMLDivElement;
  const moistureSlider = document.getElementById('moisture-slider') as HTMLInputElement;
  const moistureValue = document.getElementById('moisture-value') as HTMLSpanElement;
  const moisturePopup = document.getElementById('moisture-popup') as HTMLDivElement;

  let lightPopupTimer: number | null = null;
  let moisturePopupTimer: number | null = null;

  const updateSliderPopup = (
    slider: HTMLInputElement,
    popup: HTMLDivElement,
    format: (v: number) => string
  ) => {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = (val - min) / (max - min);
    const sliderWidth = slider.offsetWidth;
    popup.style.left = `${percent * sliderWidth}px`;
    popup.textContent = format(val);
    popup.classList.add('visible');
  };

  lightSlider?.addEventListener('input', () => {
    const value = parseFloat(lightSlider.value);
    environment.lightIntensity = value;
    lightValue.textContent = value.toFixed(1);
    lightSource.light.intensity = value;
    (lightSource.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
    updateSliderPopup(lightSlider, lightPopup, v => v.toFixed(1));

    if (lightPopupTimer) window.clearTimeout(lightPopupTimer);
    lightPopupTimer = window.setTimeout(() => {
      lightPopup.classList.remove('visible');
    }, 200);
  });

  moistureSlider?.addEventListener('input', () => {
    const value = parseFloat(moistureSlider.value);
    environment.soilMoisture = value;
    moistureValue.textContent = `${Math.round(value)}%`;
    updateSliderPopup(moistureSlider, moisturePopup, v => `${Math.round(v)}%`);

    if (moisturePopupTimer) window.clearTimeout(moisturePopupTimer);
    moisturePopupTimer = window.setTimeout(() => {
      moisturePopup.classList.remove('visible');
    }, 200);
  });
}

function bindInteractionEvents(container: HTMLElement): void {
  const getPointer = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  container.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    getPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(lightSource.mesh);
    if (intersects.length > 0) {
      isDraggingLight = true;
      controls.enabled = false;
      dragStartY = e.clientY;

      const intersectPoint = intersects[0].point.clone();
      const planeNormal = camera.getWorldDirection(new THREE.Vector3()).negate().normalize();
      dragPlane.setFromNormalAndCoplanarPoint(planeNormal, intersectPoint);
      dragPlane.normal.y = 0;
      dragPlane.normalize();

      const planeIntersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, planeIntersect);
      dragOffset.copy(lightSource.mesh.position).sub(planeIntersect);

      (container as HTMLElement).setPointerCapture(e.pointerId);
      container.style.cursor = 'grabbing';
    }
  });

  container.addEventListener('pointermove', (e: PointerEvent) => {
    getPointer(e);

    if (!isDraggingLight) {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(lightSource.mesh);
      container.style.cursor = intersects.length > 0 ? 'grab' : 'default';
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersection);
    if (intersection) {
      const newPos = intersection.add(dragOffset);
      newPos.x = THREE.MathUtils.clamp(newPos.x, -15, 15);
      newPos.z = THREE.MathUtils.clamp(newPos.z, -15, 15);

      const deltaY = (dragStartY - e.clientY) * 0.02;
      newPos.y = THREE.MathUtils.clamp(
        lightSource.mesh.position.y + deltaY * 0.3,
        1,
        8
      );
      dragStartY = e.clientY;

      lightSource.mesh.position.copy(newPos);
      lightSource.light.position.copy(newPos);
      lightSource.particles.position.copy(newPos);
      environment.lightPosition.copy(newPos);
    }
  });

  const endDrag = (e: PointerEvent) => {
    if (isDraggingLight) {
      isDraggingLight = false;
      controls.enabled = true;
      try {
        (container as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      container.style.cursor = 'default';
    }
  };

  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);
  container.addEventListener('pointerleave', endDrag);
}

function bindResizeEvents(container: HTMLElement): void {
  window.addEventListener('resize', () => {
    const rect = container.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
  });
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);

  controls.update();

  const plantResult = plant.update(deltaTime, environment);

  updateLightParticles(lightSource.particles);
  updateStarfield(starfield, deltaTime);

  const time = clock.elapsedTime;
  const flicker = 0.9 + Math.sin(time * 8) * 0.05 + Math.sin(time * 13) * 0.03;
  (lightSource.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
    environment.lightIntensity * flicker;
  lightSource.light.intensity = environment.lightIntensity * flicker;

  updateStatusUI(plantResult);

  renderer.render(scene, camera);
}

function updateStatusUI(result: { flowerProgress: number; flowering: boolean }): void {
  const growthStatus = document.getElementById('growth-status') as HTMLSpanElement | null;
  const flowerProgressEl = document.getElementById('flower-progress') as HTMLDivElement | null;

  if (growthStatus) {
    if (result.flowering) {
      growthStatus.textContent = '开花中';
      const dot = growthStatus.previousElementSibling as HTMLSpanElement | null;
      if (dot) {
        dot.classList.remove('inactive');
        dot.classList.add('active');
      }
    } else if (environment.lightIntensity < 0.3) {
      growthStatus.textContent = '弱光胁迫';
    } else if (environment.soilMoisture < 30) {
      growthStatus.textContent = '水分不足';
    } else {
      growthStatus.textContent = '正常生长';
    }
  }

  if (flowerProgressEl) {
    if (result.flowering) {
      flowerProgressEl.textContent = '已绽放';
    } else if (environment.lightIntensity < 0.3 && environment.soilMoisture > 80) {
      const percent = Math.round(result.flowerProgress * 100);
      flowerProgressEl.textContent = `${percent}%`;
    } else {
      flowerProgressEl.textContent = '—';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
