import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InkFlowEngine } from './InkFlowEngine';
import { PaperTexture } from './PaperTexture';
import { mountUI, setClickInfo, setControlChangeHandler, setResetHandler } from './UIControls';

function main(): void {
  const container = document.getElementById('canvas-container')!;
  const uiRoot = document.getElementById('ui-root')!;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f0e8);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 25);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const paperTexture = new PaperTexture(2048, 2048);
  const diffuseMap = paperTexture.generateDiffuse();
  const normalMap = paperTexture.generateNormal();

  const paperGeom = new THREE.PlaneGeometry(60, 60, 1, 1);
  const paperMat = new THREE.MeshStandardMaterial({
    map: diffuseMap,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const paperMesh = new THREE.Mesh(paperGeom, paperMat);
  paperMesh.position.z = -2;
  scene.add(paperMesh);

  const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.6);
  dirLight.position.set(5, 10, 15);
  scene.add(dirLight);

  const hemisphereLight = new THREE.HemisphereLight(0xfff8f0, 0xe8dcc8, 0.4);
  scene.add(hemisphereLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 60;
  controls.enablePan = true;
  controls.panSpeed = 0.5;
  controls.rotateSpeed = 0.6;

  const engine = new InkFlowEngine(scene, camera);

  setControlChangeHandler((key: string, value: number) => {
    switch (key) {
      case 'flowSpeed':
        engine.setFlowSpeed(value);
        break;
      case 'inkAmount':
        engine.setInkAmount(value);
        break;
      case 'spreadRadius':
        engine.setSpreadRadius(value);
        break;
    }
  });

  setResetHandler(() => {
    engine.reset();
  });

  renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const info = engine.handleClick(event, renderer.domElement);
    if (info) {
      setClickInfo(info);
    }
  });

  mountUI(uiRoot);

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes panelSlideIn {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(60, 50, 40, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.5);
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(60, 50, 40, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.5);
      cursor: pointer;
    }
  `;
  document.head.appendChild(styleEl);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate(): void {
    requestAnimationFrame(animate);
    controls.update();
    engine.update();
    renderer.render(scene, camera);
  }

  animate();
}

main();
