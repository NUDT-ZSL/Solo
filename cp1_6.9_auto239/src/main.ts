import * as THREE from 'three';
import { Maze } from './maze';
import { Player } from './player';
import { Game, Rating } from './game';

const MAZE_SIZE = 10;
const CELL_SIZE = 4;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let maze: Maze;
let player: Player;
let game: Game;
let wallMaterials: THREE.ShaderMaterial[] = [];
let isPaused = false;
let isVictory = false;
let animationId: number;
const clock = new THREE.Clock();
let ambientLight: THREE.AmbientLight;
let fogColor: THREE.FogExp2;

const app = document.getElementById('app')!;
const orbCountEl = document.getElementById('orb-count')!;
const timerEl = document.getElementById('timer')!;
const damageOverlay = document.getElementById('damage-overlay')!;
const pauseMenu = document.getElementById('pause-menu')!;
const resumeBtn = document.getElementById('resume-btn')!;
const victoryScreen = document.getElementById('victory-screen')!;
const finalTimeEl = document.getElementById('final-time')!;
const ratingEl = document.getElementById('rating')!;
const commentEl = document.getElementById('comment')!;
const restartBtn = document.getElementById('restart-btn')!;

function createWallShader(): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowIntensity: { value: 0.3 },
      time: { value: 0 },
      proximity: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float glowIntensity;
      uniform float time;
      uniform float proximity;
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vec3 colorA = vec3(0.15, 0.15, 0.45);
        vec3 colorB = vec3(0.45, 0.2, 0.6);
        float mixValue = (vPosition.y + vPosition.x * 0.1 + sin(time * 0.5 + vPosition.x * 0.2) * 0.5 + 0.5;
        vec3 baseColor = mix(colorA, colorB, clamp(mixValue, 0.0, 1.0));
        float glow = glowIntensity + proximity * 0.8;
        vec3 emissive = baseColor * glow;
        vec3 finalColor = baseColor + emissive * 0.5;
        gl_FragColor = vec4(finalColor, 0.75 + proximity * 0.2);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
  wallMaterials.push(material);
  return material;
}

function buildMazeVisuals(): void {
  const walls = maze.getWallPositions();
  const wallHeight = 3.5;
  const wallShader = createWallShader();

  for (const wall of walls) {
    let geometry: THREE.BufferGeometry;
    let mesh: THREE.Mesh;

    if (wall.isHorizontal) {
      geometry = new THREE.BoxGeometry(CELL_SIZE + 0.1, wallHeight, 0.25);
    } else {
      geometry = new THREE.BoxGeometry(0.25, wallHeight, CELL_SIZE + 0.1);
    }

    mesh = new THREE.Mesh(geometry, wallShader.clone());
    mesh.position.set(wall.x, wallHeight / 2, wall.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const totalSize = MAZE_SIZE * CELL_SIZE;
  const floorGeometry = new THREE.PlaneGeometry(totalSize + 0.5, totalSize + 0.5);
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const ctx = floorCanvas.getContext('2d')!;

  ctx.fillStyle = '#0a0a2e';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
  ctx.lineWidth = 1;
  const gridSize = 512 / MAZE_SIZE;
  for (let i = 0; i <= MAZE_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize * CELL_SIZE, 0);
    ctx.lineTo(i * gridSize * CELL_SIZE, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize * CELL_SIZE);
    ctx.lineTo(512, i * gridSize * CELL_SIZE);
    ctx.stroke();
  }

  for (let y = 0; y < MAZE_SIZE; y++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      const cell = maze.getCell(x, y);
      if (!cell) continue;
    }
  }

  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: 0x1a1a4e,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(totalSize / 2, 0, totalSize / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceilingGeometry = new THREE.PlaneGeometry(totalSize + 0.5, totalSize + 0.5);
  const ceilingMaterial = new THREE.MeshBasicMaterial({
    color: 0x050515,
    side: THREE.DoubleSide,
  });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(totalSize / 2, wallHeight, totalSize / 2);
  scene.add(ceiling);

  fogColor = new THREE.FogExp2(0x0a0a2e, 0.025);
  scene.fog = fogColor;
}

function setupLights(): void {
  ambientLight = new THREE.AmbientLight(0x404080, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xaabbff, 0.4);
  dirLight.position.set(20, 30, 10);
  scene.add(dirLight);

  const purpleLight = new THREE.PointLight(0xa855f7, 0.6, 30);
  purpleLight.position.set(2, 2.5, 2);
  scene.add(purpleLight);

  const cyanLight = new THREE.PointLight(0x22d3ee, 0.6, 30);
  const endPos = maze.cellToWorld(MAZE_SIZE - 1, MAZE_SIZE - 1);
  cyanLight.position.set(endPos.x, 2.5, endPos.z);
  scene.add(cyanLight);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showDamage(): void {
  damageOverlay.classList.add('active');
  setTimeout(() => {
    damageOverlay.classList.remove('active');
  }, 200);
}

function showVictory(time: number, rating: Rating, comment: string): void {
  isVictory = true;
  finalTimeEl.textContent = formatTime(time);
  ratingEl.textContent = rating;
  ratingEl.className = `rating-${rating}`;
  commentEl.textContent = comment;
  setTimeout(() => {
    victoryScreen.classList.add('show');
  }, 1500);
}

function togglePause(force?: boolean): void {
  if (isVictory) return;
  const newPaused = force !== undefined ? force : !isPaused;
  isPaused = newPaused;
  if (game) game.setPaused(isPaused);
  if (isPaused) {
    pauseMenu.classList.add('show');
    document.body.style.cursor = 'default';
  } else {
    pauseMenu.classList.remove('show');
    document.body.style.cursor = 'none';
  }
  game?.resumeAudio();
}

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a2e);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  app.appendChild(renderer.domElement);

  maze = new Maze(MAZE_SIZE, CELL_SIZE);
  player = new Player(camera, maze, renderer.domElement);
  game = new Game(scene, maze, {
    onOrbCollected: (count) => {
      orbCountEl.textContent = count.toString();
    },
    onTimeUpdated: (time) => {
      timerEl.textContent = time;
    },
    onDamage: () => {
      showDamage();
      player.bounceBack();
    },
    onVictory: (time, rating, comment) => {
      showVictory(time, rating, comment);
    },
  });

  buildMazeVisuals();
  setupLights();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      togglePause();
    }
  });

  resumeBtn.addEventListener('click', () => togglePause(false));
  restartBtn.addEventListener('click', () => location.reload());

  renderer.domElement.addEventListener('click', () => {
    game.resumeAudio();
  });

  animate();
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (!isPaused && !isVictory) {
    player.update(deltaTime, false);

    const hit = game.update(deltaTime, player.getPosition(), player.getForwardDirection());

    if (player.consumeOrbThrowRequest()) {
      game.throwOrb(player.getPosition(), player.getForwardDirection());
    }

    const proximity = player.checkNearWall();
    for (const mat of wallMaterials) {
      mat.uniforms.time.value = elapsed;
      mat.uniforms.proximity.value = THREE.MathUtils.lerp(
        mat.uniforms.proximity.value,
        proximity,
        0.1
      );
    }
  } else {
    for (const mat of wallMaterials) {
      mat.uniforms.time.value = elapsed;
    }
  }

  renderer.render(scene, camera);
}

init();
