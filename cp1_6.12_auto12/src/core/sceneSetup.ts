import * as THREE from 'three';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  groundGroup: THREE.Group;
}

export function setupScene(container: HTMLElement): SceneContext {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.Fog(0x0d1117, 80, 200);

  const camera = new THREE.PerspectiveCamera(
    50,
    width / height,
    0.1,
    500
  );
  camera.position.set(0, 45, 45);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const groundGroup = new THREE.Group();
  scene.add(groundGroup);

  createGround(groundGroup);
  createGrid(groundGroup);
  setupLights(scene);

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  return { scene, camera, renderer, groundGroup };
}

function createGround(group: THREE.Group) {
  const geometry = new THREE.PlaneGeometry(200, 200);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
}

function createGrid(group: THREE.Group) {
  const gridHelper = new THREE.GridHelper(200, 50, 0x333344, 0x222233);
  group.add(gridHelper);

  const innerGrid = new THREE.GridHelper(120, 30, 0x4488ff, 0x2a2a3a);
  innerGrid.position.y = 0.01;
  group.add(innerGrid);
}

function setupLights(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(0x6080ff, 0.5);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x88aaff, 0x1a1a2e, 0.4);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(30, 60, 25);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.camera.left = -80;
  dirLight.shadow.camera.right = 80;
  dirLight.shadow.camera.top = 80;
  dirLight.shadow.camera.bottom = -80;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x4488ff, 0.25);
  fillLight.position.set(-20, 30, -30);
  scene.add(fillLight);
}
