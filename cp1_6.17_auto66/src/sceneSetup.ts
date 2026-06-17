import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneCore {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  soilContainer: THREE.Group;
  animate: (callback: (delta: number) => void) => void;
}

export function initScene(container: HTMLElement): SceneCore {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0D0D0D);

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 20);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.target.set(0, -4, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  const soilContainer = createSoilContainer();
  scene.add(soilContainer);

  let animationId: number;
  const clock = new THREE.Clock();

  const animate = (callback: (delta: number) => void) => {
    const tick = () => {
      animationId = requestAnimationFrame(tick);
      const delta = clock.getDelta();
      callback(delta);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();
  };

  const handleResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', handleResize);

  const originalDispose = () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
  };

  (scene as any).dispose = originalDispose;

  return {
    scene,
    camera,
    renderer,
    controls,
    soilContainer,
    animate,
  };
}

function createSoilContainer(): THREE.Group {
  const group = new THREE.Group();
  const width = 12;
  const height = 8;
  const depth = 12;

  const soilGeometry = new THREE.BoxGeometry(width, height, depth);
  const soilMaterial = new THREE.MeshPhongMaterial({
    color: 0x4E342E,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
  });
  const soil = new THREE.Mesh(soilGeometry, soilMaterial);
  soil.position.y = -height / 2;
  soil.receiveShadow = true;
  group.add(soil);

  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0xA0A0A0,
    transparent: true,
    opacity: 0.3,
  });

  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const edges = [
    [-halfW, -halfH, -halfD], [halfW, -halfH, -halfD],
    [halfW, -halfH, -halfD], [halfW, -halfH, halfD],
    [halfW, -halfH, halfD], [-halfW, -halfH, halfD],
    [-halfW, -halfH, halfD], [-halfW, -halfH, -halfD],
    [-halfW, halfH, -halfD], [halfW, halfH, -halfD],
    [halfW, halfH, -halfD], [halfW, halfH, halfD],
    [halfW, halfH, halfD], [-halfW, halfH, halfD],
    [-halfW, halfH, halfD], [-halfW, halfH, -halfD],
    [-halfW, -halfH, -halfD], [-halfW, halfH, -halfD],
    [halfW, -halfH, -halfD], [halfW, halfH, -halfD],
    [halfW, -halfH, halfD], [halfW, halfH, halfD],
    [-halfW, -halfH, halfD], [-halfW, halfH, halfD],
  ];

  const points = edges.map(e => new THREE.Vector3(e[0], e[1], e[2]));
  const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const edgeLines = new THREE.LineSegments(edgeGeometry, gridMaterial);
  edgeLines.position.y = -halfH;
  group.add(edgeLines);

  const gridDivisions = 6;
  for (let i = 1; i < gridDivisions; i++) {
    const z = -halfD + (depth * i) / gridDivisions;
    const gridPoints = [
      new THREE.Vector3(-halfW, 0, z),
      new THREE.Vector3(halfW, 0, z),
    ];
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridLine = new THREE.LineSegments(gridGeo, gridMaterial);
    gridLine.position.y = -halfH;
    group.add(gridLine);
  }
  for (let i = 1; i < gridDivisions; i++) {
    const x = -halfW + (width * i) / gridDivisions;
    const gridPoints = [
      new THREE.Vector3(x, 0, -halfD),
      new THREE.Vector3(x, 0, halfD),
    ];
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridLine = new THREE.LineSegments(gridGeo, gridMaterial);
    gridLine.position.y = -halfH;
    group.add(gridLine);
  }

  return group;
}

export function animateCamera(
  camera: THREE.PerspectiveCamera,
  targetZ: number,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    const startZ = camera.position.z;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      camera.position.z = startZ + (targetZ - startZ) * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    animate();
  });
}
