import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
}

export const INITIAL_CAMERA_POSITION = new THREE.Vector3(85, 85, 85);
export const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();

  const canvasGradient = document.createElement('canvas');
  canvasGradient.width = 2;
  canvasGradient.height = 512;
  const ctx = canvasGradient.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#020617');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  const backgroundTexture = new THREE.CanvasTexture(canvasGradient);
  scene.background = backgroundTexture;

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.copy(INITIAL_CAMERA_POSITION);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 15;
  controls.maxDistance = 400;
  controls.target.copy(INITIAL_CAMERA_TARGET);
  controls.update();

  const starsGeometry = new THREE.BufferGeometry();
  const starPositions: number[] = [];
  const starSizes: number[] = [];
  const starColors: number[] = [];

  for (let i = 0; i < 500; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 300 + Math.random() * 200;

    starPositions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    starSizes.push(1 + Math.random() * 2);

    const colorVariation = 0.85 + Math.random() * 0.15;
    starColors.push(0.9 * colorVariation, 0.95 * colorVariation, 1.0 * colorVariation);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

  const starsMaterial = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
  scene.add(ambientLight);

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', handleResize);

  return { scene, camera, renderer, controls };
}

export function animateCameraTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPosition: THREE.Vector3,
  targetLookAt: THREE.Vector3,
  duration: number = 1500
): Promise<void> {
  return new Promise((resolve) => {
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const updateCamera = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
      controls.target.lerpVectors(startTarget, targetLookAt, easedProgress);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(updateCamera);
      } else {
        resolve();
      }
    };

    updateCamera();
  });
}
