import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Galaxy, type GalaxyParams } from './galaxy';
import { Controls } from './controls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let orbitControls: OrbitControls;
let galaxy: Galaxy;
let controls: Controls;
let backgroundStars: THREE.Points;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

const clock = new THREE.Clock();
let selectedParticleIndex: number | null = null;

function init(): void {
  const container = document.getElementById('app') as HTMLElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0D0D1A);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(5, 3, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0D0D1A);
  container.appendChild(renderer.domElement);

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.minDistance = 2;
  orbitControls.maxDistance = 20;
  orbitControls.target.set(0, 0, 0);

  const params: GalaxyParams = {
    particleCount: 3000,
    rotationSpeed: 0.1,
    armWidth: 0.3,
    outerColor: '#FC8181',
  };

  galaxy = new Galaxy(params);
  scene.add(galaxy.points);

  createBackgroundStars();

  controls = new Controls({
    onParamsChange: (newParams) => {
      galaxy.updateParams(newParams);
      if (newParams.particleCount !== undefined) {
        selectedParticleIndex = null;
        controls.updateParticleInfo(null);
      }
    },
  });

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.1 };
  mouse = new THREE.Vector2();

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onMouseClick);

  animate();
}

function createBackgroundStars(): void {
  const starCount = 500;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const opacities = new Float32Array(starCount);
  const phases = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const radius = 30 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    colors[i3] = 1;
    colors[i3 + 1] = 1;
    colors[i3 + 2] = 1;

    sizes[i] = 1 + Math.random();
    opacities[i] = 0.3 + Math.random() * 0.7;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  (material as any).userData = { opacities, phases, baseSizes: sizes };

  backgroundStars = new THREE.Points(geometry, material);
  scene.add(backgroundStars);
}

function updateBackgroundStars(time: number): void {
  const material = backgroundStars.material as THREE.PointsMaterial & {
    userData: { opacities: Float32Array; phases: Float32Array };
  };
  const { opacities, phases } = material.userData;

  let avgOpacity = 0;
  for (let i = 0; i < opacities.length; i++) {
    const flicker = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 1.5 + phases[i]));
    avgOpacity += opacities[i] * flicker;
  }
  material.opacity = avgOpacity / opacities.length;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(galaxy.points);

  if (intersects.length > 0) {
    const intersection = intersects[0];
    const index = intersection.index;

    if (index !== undefined) {
      if (selectedParticleIndex === index) {
        selectedParticleIndex = null;
        galaxy.selectParticle(-1);
        controls.updateParticleInfo(null);
      } else {
        selectedParticleIndex = index;
        galaxy.selectParticle(index);
        if (galaxy.selectedParticle) {
          controls.updateParticleInfo(galaxy.selectedParticle);
        }
      }
    }
  } else {
    selectedParticleIndex = null;
    galaxy.selectParticle(-1);
    controls.updateParticleInfo(null);
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  galaxy.update(delta);
  updateBackgroundStars(elapsed);
  orbitControls.update();

  if (selectedParticleIndex !== null && galaxy.selectedParticle) {
    controls.updateParticleInfo(galaxy.selectedParticle);
  }

  renderer.render(scene, camera);
}

init();
