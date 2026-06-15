import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  clock: THREE.Clock;
  particleGroup: THREE.Group;
}

export function createScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 30);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000511, 1);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 10;
  controls.maxDistance = 80;
  controls.enablePan = false;

  const ambientLight = new THREE.AmbientLight(0x2233ff, 0.3);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x4466ff, 1.5, 100);
  pointLight1.position.set(20, 20, 20);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x9944ff, 1.0, 100);
  pointLight2.position.set(-20, -10, -20);
  scene.add(pointLight2);

  const particleGroup = new THREE.Group();
  scene.add(particleGroup);

  const clock = new THREE.Clock();

  const handleResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', handleResize);

  return {
    scene,
    camera,
    renderer,
    controls,
    clock,
    particleGroup,
  };
}

export function renderFrame(ctx: SceneContext) {
  ctx.controls.update();
  ctx.particleGroup.rotation.y += 0.0008;
  ctx.renderer.render(ctx.scene, ctx.camera);
}

export function resetCamera(ctx: SceneContext) {
  ctx.camera.position.set(0, 0, 30);
  ctx.controls.target.set(0, 0, 0);
  ctx.controls.update();
}
