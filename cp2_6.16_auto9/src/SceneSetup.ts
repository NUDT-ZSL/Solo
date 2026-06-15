declare const THREE: any;

export interface SceneInstances {
  scene: any;
  camera: any;
  renderer: any;
  gridGround: any;
}

export function setupScene(container: HTMLElement): SceneInstances {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  const cameraDistance = 15;
  const angleRad = (45 * Math.PI) / 180;
  camera.position.set(
    cameraDistance * Math.sin(angleRad),
    cameraDistance * Math.cos(angleRad),
    cameraDistance * Math.cos(angleRad)
  );
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const gridSize = 40;
  const gridDivisions = 40;
  const gridGround = new THREE.GridHelper(gridSize, gridDivisions, 0xffffff, 0xffffff);
  const gridMaterial = gridGround.material;
  if (Array.isArray(gridMaterial)) {
    gridMaterial.forEach((m: any) => {
      m.transparent = true;
      m.opacity = 0.3;
      m.color.setRGB(200 / 255, 200 / 255, 200 / 255);
    });
  } else {
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.3;
    gridMaterial.color.setRGB(200 / 255, 200 / 255, 200 / 255);
  }
  scene.add(gridGround);

  const groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(gridSize, gridSize),
    new THREE.ShadowMaterial({ opacity: 0.2 })
  );
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.receiveShadow = true;
  groundPlane.position.y = -0.001;
  scene.add(groundPlane);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 15, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -25;
  directionalLight.shadow.camera.right = 25;
  directionalLight.shadow.camera.top = 25;
  directionalLight.shadow.camera.bottom = -25;
  scene.add(directionalLight);

  const pointLight1 = new THREE.PointLight(0x3498db, 0.3, 50);
  pointLight1.position.set(-10, 10, -10);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xe74c3c, 0.2, 50);
  pointLight2.position.set(10, 8, -8);
  scene.add(pointLight2);

  const handleResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', handleResize);

  return { scene, camera, renderer, gridGround };
}

export function createOrbitControls(camera: any, domElement: any): any {
  const controls = new THREE.OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.dampingTarget = 0;
  controls.smoothTime = 0.3;

  controls.minDistance = 2;
  controls.maxDistance = 25;

  controls.minPolarAngle = (10 * Math.PI) / 180;
  controls.maxPolarAngle = (80 * Math.PI) / 180;

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };

  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  controls.target.set(0, 0.5, 0);
  controls.update();

  return controls;
}
