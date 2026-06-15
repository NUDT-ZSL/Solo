import * as THREE from 'three';

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;
}

export function createScene(containerId: string): SceneSetup {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container ${containerId} not found`);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0020, 0.006);

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 60, 120);
  camera.lookAt(0, 10, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  addLighting(scene);
  addStarfield(scene);
  addStageFloor(scene);
  addAmbientStageGlow(scene);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { scene, camera, renderer, container };
}

function addLighting(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0x403060, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xaaccff, 0.8);
  mainLight.position.set(30, 80, 40);
  scene.add(mainLight);

  const rimLight = new THREE.DirectionalLight(0xff88cc, 0.5);
  rimLight.position.set(-40, 40, -30);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x8866ff, 2, 200);
  fillLight.position.set(0, 50, 0);
  scene.add(fillLight);

  const spotLight1 = new THREE.SpotLight(0x6688ff, 3, 250, Math.PI / 6, 0.5, 1);
  spotLight1.position.set(-40, 80, 40);
  spotLight1.target.position.set(-20, 0, -20);
  scene.add(spotLight1);
  scene.add(spotLight1.target);

  const spotLight2 = new THREE.SpotLight(0xff66aa, 3, 250, Math.PI / 6, 0.5, 1);
  spotLight2.position.set(40, 80, 40);
  spotLight2.target.position.set(20, 0, 20);
  scene.add(spotLight2);
  scene.add(spotLight2.target);
}

function addStarfield(scene: THREE.Scene): void {
  const starCount = 150;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const radius = 300 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const colorChoice = Math.random();
    if (colorChoice < 0.3) {
      colors[i * 3] = 0.8;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    } else if (colorChoice < 0.6) {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.9;
      colors[i * 3 + 2] = 0.8;
    } else {
      colors[i * 3] = 0.9;
      colors[i * 3 + 1] = 0.7;
      colors[i * 3 + 2] = 1.0;
    }

    sizes[i] = 1 + Math.random() * 1.5;
  }

  const starCanvas = document.createElement('canvas');
  starCanvas.width = 64;
  starCanvas.height = 64;
  const ctx = starCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const starTexture = new THREE.CanvasTexture(starCanvas);

  const alphas = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) alphas[i] = 0.9;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: starTexture },
      globalOpacity: { value: 0.9 },
      sizeScale: { value: 600.0 }
    },
    vertexShader: `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float sizeScale;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (sizeScale / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float globalOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard;
        gl_FragColor = vec4(vColor, texColor.a * vAlpha * globalOpacity);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const stars = new THREE.Points(geometry, material);
  stars.userData.isStars = true;
  stars.userData.sizes = sizes;
  scene.add(stars);
}

function addStageFloor(scene: THREE.Scene): void {
  const floorRadius = 120;
  const floorGeometry = new THREE.CircleGeometry(floorRadius, 64);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1b2a,
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
    metalness: 0.8
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const gridHelper = new THREE.RingGeometry(floorRadius - 2, floorRadius, 64);
  const gridMaterial = new THREE.MeshBasicMaterial({
    color: 0x335599,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const border = new THREE.Mesh(gridHelper, gridMaterial);
  border.rotation.x = -Math.PI / 2;
  border.position.y = -0.4;
  scene.add(border);

  for (let i = 1; i <= 4; i++) {
    const ringR = (floorRadius * i) / 4;
    const ringGeo = new THREE.RingGeometry(ringR - 0.2, ringR + 0.2, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x224488,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.45;
    scene.add(ring);
  }

  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const linePoints = [
      new THREE.Vector3(0, -0.45, 0),
      new THREE.Vector3(
        Math.cos(angle) * floorRadius,
        -0.45,
        Math.sin(angle) * floorRadius
      )
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x224488,
      transparent: true,
      opacity: 0.1
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
  }
}

function addAmbientStageGlow(scene: THREE.Scene): void {
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const ctx = glowCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(80, 40, 150, 0.6)');
  gradient.addColorStop(0.5, 'rgba(40, 20, 80, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const glowTexture = new THREE.CanvasTexture(glowCanvas);

  const glowGeometry = new THREE.PlaneGeometry(240, 240);
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.3;
  scene.add(glow);

  const domeGeo = new THREE.SphereGeometry(250, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new THREE.MeshBasicMaterial({
    color: 0x1a0030,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = -50;
  scene.add(dome);
}

export function updateStars(scene: THREE.Scene, time: number): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Points && obj.userData.isStars) {
      const sizes = obj.userData.sizes as Float32Array;
      const sizeAttr = obj.geometry.getAttribute('size') as THREE.BufferAttribute;
      for (let i = 0; i < sizes.length; i++) {
        const flicker = 0.7 + 0.3 * Math.sin(time * 2 + i * 0.5);
        (sizeAttr.array as Float32Array)[i] = sizes[i] * flicker;
      }
      sizeAttr.needsUpdate = true;
    }
  });
}
