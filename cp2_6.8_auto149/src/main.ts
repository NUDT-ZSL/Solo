import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Cloth } from './cloth';
import { ClothTexture } from './texture';
import { UIControls, FPSCounter } from './controls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let cloth: Cloth;
let clothTexture: ClothTexture;
let uiControls: UIControls;
let fpsCounter: FPSCounter;
let sphere: THREE.Mesh;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let isDragging: boolean = false;
let dragPlane: THREE.Plane;
let dragOffset: THREE.Vector3;

const clock = new THREE.Clock();

init();
animate();

function init() {
  const versionEl = document.getElementById('three-version');
  if (versionEl) {
    versionEl.textContent = `Three.js r${THREE.REVISION}`;
  }

  scene = new THREE.Scene();
  const bgGradient = createBackgroundGradient();
  scene.background = bgGradient;

  const canvas = document.getElementById('app') as HTMLCanvasElement;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(6, 4, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 + 0.2;
  controls.minDistance = 3;
  controls.maxDistance = 20;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 3);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.radius = 4;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);

  const groundGeometry = new THREE.PlaneGeometry(30, 30);
  const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.15 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.5;
  ground.receiveShadow = true;
  scene.add(ground);

  cloth = new Cloth(20, 4);
  scene.add(cloth.mesh);
  scene.add(cloth.wireframe);

  clothTexture = new ClothTexture(512, 512);
  cloth.setTexture(clothTexture.getTexture());

  const sphereGeometry = new THREE.SphereGeometry(1.2, 64, 64);
  const sphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x6EE7B7,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    shininess: 32,
    specular: 0xffffff
  });
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, -1, 0);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);

  cloth.setSphere(sphere);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1);
  dragOffset = new THREE.Vector3();

  setupDragHandlers();

  uiControls = new UIControls(cloth, clothTexture);
  fpsCounter = new FPSCounter();

  window.addEventListener('resize', onWindowResize);

  setTimeout(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => loading.remove(), 500);
    }
  }, 500);
}

function createBackgroundGradient(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0B0C10');
  gradient.addColorStop(0.5, '#121620');
  gradient.addColorStop(1, '#1A1F2E');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function setupDragHandlers() {
  const domElement = renderer.domElement;

  domElement.addEventListener('mousedown', onMouseDown);
  domElement.addEventListener('mousemove', onMouseMove);
  domElement.addEventListener('mouseup', onMouseUp);
  domElement.addEventListener('mouseleave', onMouseUp);

  domElement.addEventListener('touchstart', onTouchStart, { passive: false });
  domElement.addEventListener('touchmove', onTouchMove, { passive: false });
  domElement.addEventListener('touchend', onTouchEnd);
}

function onMouseDown(event: MouseEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sphere);

  if (intersects.length > 0) {
    isDragging = true;
    controls.enabled = false;

    const intersectionPoint = intersects[0].point;
    dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      intersectionPoint
    );
    dragOffset.copy(sphere.position).sub(intersectionPoint);
  }
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(dragPlane, intersection);

  if (intersection) {
    sphere.position.x = THREE.MathUtils.clamp(intersection.x + dragOffset.x, -3, 3);
    sphere.position.z = THREE.MathUtils.clamp(intersection.z + dragOffset.z, -3, 3);
  }
}

function onMouseUp() {
  isDragging = false;
  controls.enabled = true;
}

function onTouchStart(event: TouchEvent) {
  event.preventDefault();
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    onMouseDown(mouseEvent);
  }
}

function onTouchMove(event: TouchEvent) {
  event.preventDefault();
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    onMouseMove(mouseEvent);
  }
}

function onTouchEnd() {
  onMouseUp();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);

  cloth.update(deltaTime);
  clothTexture.update(deltaTime);

  controls.update();
  fpsCounter.update();

  renderer.render(scene, camera);
}
