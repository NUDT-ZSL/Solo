import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { DustCorridor } from './DustCorridor';
import { SPECTRAL_CONFIG, SpectralType } from './StarParticle';
import UIControls from './UIControls';
import { useStarStore } from './store';

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 20, 80);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
let infoTimeout: ReturnType<typeof setTimeout> | null = null;

function initScene() {
  const container = document.getElementById('canvas-container')!;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a2e, 0.003);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(DEFAULT_CAMERA_POS);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0a2e, 1);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 10;
  controls.maxDistance = 200;
  controls.target.copy(DEFAULT_CAMERA_TARGET);

  const corridor = new DustCorridor(scene);

  const ambientParticles = createAmbientDust(scene);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hit = corridor.findParticleByScreenRay(raycaster);
    if (hit) {
      const config = SPECTRAL_CONFIG[hit.data.spectralType];
      corridor.spawnRipple(hit.worldPos, hit.data.spectralType);
      showStarInfo(hit.data.spectralType, config.brightness);
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let lastTime = performance.now();
  let prevDensity = useStarStore.getState().particleDensity;
  let prevShift = useStarStore.getState().spectralShift;
  let prevSeed = useStarStore.getState().randomSeed;

  useStarStore.subscribe((state) => {
    corridor.flowSpeed = state.flowSpeed;

    if (state.particleDensity !== prevDensity) {
      corridor.density = state.particleDensity;
      prevDensity = state.particleDensity;
    }
    if (state.spectralShift !== prevShift) {
      corridor.spectralShift = state.spectralShift;
      prevShift = state.spectralShift;
    }
    if (state.randomSeed !== prevSeed) {
      corridor.randomize();
      prevSeed = state.randomSeed;
    }
  });

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    corridor.update(delta);
    updateAmbientDust(ambientParticles, delta);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  return { camera, controls, corridor };
}

function createAmbientDust(scene: THREE.Scene): THREE.Points {
  const count = 800;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 300;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 300;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    sizes[i] = 0.1 + Math.random() * 0.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (200.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
        vAlpha = 0.3 + 0.2 * sin(position.x * 0.1 + position.z * 0.1);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(0.5, 0.5, 0.8, vAlpha * glow * 0.3);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  return points;
}

function updateAmbientDust(points: THREE.Points, delta: number) {
  const positions = points.geometry.attributes.position as THREE.BufferAttribute;
  const arr = positions.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 1] += delta * 0.3;
    if (arr[i + 1] > 150) arr[i + 1] = -150;
  }
  positions.needsUpdate = true;
}

function showStarInfo(spectralType: SpectralType, brightness: number) {
  const infoEl = document.getElementById('star-info')!;
  const spectralEl = document.getElementById('info-spectral')!;
  const brightnessEl = document.getElementById('info-brightness')!;
  const config = SPECTRAL_CONFIG[spectralType];

  spectralEl.textContent = config.label;
  spectralEl.style.color = `rgb(${Math.round(config.color.r * 255)}, ${Math.round(config.color.g * 255)}, ${Math.round(config.color.b * 255)})`;
  brightnessEl.textContent = `亮度 ${(brightness * 100).toFixed(0)}%`;

  infoEl.classList.add('visible');

  if (infoTimeout) clearTimeout(infoTimeout);
  infoTimeout = setTimeout(() => {
    infoEl.classList.remove('visible');
  }, 2000);
}

function mountUI(camera: THREE.Camera, controls: OrbitControls) {
  const overlay = document.getElementById('ui-overlay')!;
  const root = createRoot(overlay);

  const handleResetView = () => {
    camera.position.copy(DEFAULT_CAMERA_POS);
    controls.target.copy(DEFAULT_CAMERA_TARGET);
    controls.update();
  };

  const handleRandomize = () => {
    useStarStore.getState().randomize();
  };

  root.render(
    React.createElement(UIControls, {
      onResetView: handleResetView,
      onRandomize: handleRandomize,
    })
  );
}

const { camera, controls } = initScene();
mountUI(camera, controls);
