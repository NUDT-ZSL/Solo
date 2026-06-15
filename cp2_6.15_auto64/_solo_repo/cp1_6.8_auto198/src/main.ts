import * as THREE from 'three';
import { TideSystem } from './TideSystem';
import { ParticleSystem } from './ParticleSystem';
import { UI } from './UI';

function init(): void {
  const container = document.getElementById('app')!;
  container.style.cssText = `
    width: 100%;
    height: 100%;
    position: relative;
    background: linear-gradient(180deg, #0a0a2e 0%, #1a1040 40%, #2d1850 70%, #1a1035 100%);
  `;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a2e, 0.006);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 40, 80);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const tideSystem = new TideSystem();
  scene.add(tideSystem.mesh);

  const particleSystem = new ParticleSystem();
  scene.add(particleSystem.points);
  scene.add(particleSystem.trailPoints);

  const ui = new UI(container, camera, renderer, tideSystem, particleSystem);

  const ambientLight = new THREE.AmbientLight(0x1a1a4a, 0.5);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x4060ff, 2, 200);
  pointLight1.position.set(40, 30, 40);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x8040c0, 1.5, 200);
  pointLight2.position.set(-40, 25, -30);
  scene.add(pointLight2);

  const clock = new THREE.Clock();
  let elapsed = 0;

  const pageOverlay = document.createElement('div');
  pageOverlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #0a0a2e;
    z-index: 1000;
    pointer-events: none;
    transition: opacity 1.5s ease;
  `;
  document.body.appendChild(pageOverlay);
  requestAnimationFrame(() => {
    pageOverlay.style.opacity = '0';
  });
  setTimeout(() => {
    pageOverlay.remove();
  }, 2000);

  function animate(): void {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    elapsed += delta;

    tideSystem.update(elapsed);
    particleSystem.update(elapsed, delta);
    ui.update();

    const t = elapsed * 0.3;
    pointLight1.position.x = Math.sin(t) * 50;
    pointLight1.position.z = Math.cos(t) * 50;
    pointLight2.position.x = Math.sin(t * 0.7 + 2) * 45;
    pointLight2.position.z = Math.cos(t * 0.7 + 2) * 45;

    renderer.render(scene, camera);
  }

  animate();
}

init();
