import * as THREE from 'three';
import {
  generateLabyrinth,
  MemoryEntry,
  EmotionType,
  LabyrinthData,
  CorridorSegment,
} from './labyrinth';
import { MemoryRoom, EMOTION_COLORS } from './memoryRoom';

const SAMPLE_MEMORIES: MemoryEntry[] = [
  {
    id: '1',
    title: '第一次旅行',
    date: '2015.07.12',
    emotion: 'happy',
    description: '和家人一起去海边的那个夏天',
    weather: '阳光明媚',
    people: ['爸爸', '妈妈', '我'],
    mood: '兴奋',
  },
  {
    id: '2',
    title: '高中毕业典礼',
    date: '2018.06.20',
    emotion: 'happy',
    description: '接过毕业证书的那一刻，青春的里程碑',
    weather: '多云',
    people: ['同学', '老师', '家人'],
    mood: '激动',
  },
  {
    id: '3',
    title: '初恋分手',
    date: '2019.03.08',
    emotion: 'sad',
    description: '那个春天的雨天，心里像下了一场很久的雨',
    weather: '小雨',
    people: ['我'],
    mood: '失落',
  },
  {
    id: '4',
    title: '找到第一份工作',
    date: '2020.09.15',
    emotion: 'calm',
    description: '收到offer邮件的那个下午，阳光正好',
    weather: '晴朗',
    people: ['我'],
    mood: '安心',
  },
  {
    id: '5',
    title: '被冤枉的争吵',
    date: '2021.11.03',
    emotion: 'angry',
    description: '办公室里不被理解的那一天',
    weather: '阴天',
    people: ['同事'],
    mood: '愤怒',
  },
  {
    id: '6',
    title: '婚礼那一天',
    date: '2023.05.28',
    emotion: 'happy',
    description: '穿着白色婚纱走向他的那一刻，世界都在发光',
    weather: '晴空万里',
    people: ['爱人', '亲友'],
    mood: '幸福',
  },
  {
    id: '7',
    title: '孩子的第一声啼哭',
    date: '2024.08.10',
    emotion: 'happy',
    description: '产房里听到那个小小生命的声音',
    weather: '清晨微露',
    people: ['爱人', '宝宝'],
    mood: '感动',
  },
];

class MemoryLabyrinthApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private memoryRooms: MemoryRoom[] = [];
  private labyrinthData!: LabyrinthData;
  private floorGroup: THREE.Group;
  private compassLights: THREE.PointLight[] = [];
  private compassMeshes: THREE.Mesh[] = [];

  private keys: Record<string, boolean> = {};
  private cameraYaw = 0;
  private cameraPitch = 0;
  private velocity = new THREE.Vector3();
  private isPointerLocked = false;
  private currentRoom: MemoryRoom | null = null;
  private isScreenshotting = false;
  private screenshotLockTime = 0;
  private screenshotTimer: number | null = null;

  private floorUnderParticles!: THREE.Points;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0b1a);
    this.scene.fog = new THREE.FogExp2(0x0b0b1a, 0.025);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.floorGroup = new THREE.Group();
    this.scene.add(this.floorGroup);

    this.init();
  }

  private init(): void {
    this.labyrinthData = generateLabyrinth(SAMPLE_MEMORIES);

    this.buildFloor();
    this.buildCorridors();
    this.buildCompassPoints();

    this.labyrinthData.rooms.forEach((roomData) => {
      const room = new MemoryRoom(roomData);
      this.memoryRooms.push(room);
      this.scene.add(room.group);
    });

    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x00e5ff, 0x0b0b1a, 0.3);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.25);
    dir.position.set(10, 20, 10);
    this.scene.add(dir);

    const startRoom = this.labyrinthData.rooms[0];
    this.camera.position.set(startRoom.centerX, 1.6, startRoom.centerZ + 1);
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0;

    this.setupEventListeners();
    this.buildUI();
    this.fadeOutLoading();
    this.animate();
  }

  private buildFloor(): void {
    const bounds = this.labyrinthData.bounds;
    const w = bounds.maxX - bounds.minX + 12;
    const d = bounds.maxZ - bounds.minZ + 12;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    grd.addColorStop(0, 'rgba(20, 30, 60, 0.6)');
    grd.addColorStop(1, 'rgba(11, 11, 26, 0.9)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(0, 229, 255, ${Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(w / 8, d / 8);

    const floorGeo = new THREE.PlaneGeometry(w, d, 50, 50);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x141428,
      roughness: 0.1,
      metalness: 0.4,
      transmission: 0.35,
      transparent: true,
      opacity: 0.75,
      map: texture,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    this.floorGroup.add(floor);

    const underCount = 3000;
    const underPositions = new Float32Array(underCount * 3);
    const underColors = new Float32Array(underCount * 3);
    for (let i = 0; i < underCount; i++) {
      underPositions[i * 3] = cx + (Math.random() - 0.5) * w;
      underPositions[i * 3 + 1] = -0.3;
      underPositions[i * 3 + 2] = cz + (Math.random() - 0.5) * d;
      const c = new THREE.Color(0x00e5ff);
      c.offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.1);
      underColors[i * 3] = c.r;
      underColors[i * 3 + 1] = c.g;
      underColors[i * 3 + 2] = c.b;
    }
    const underGeo = new THREE.BufferGeometry();
    underGeo.setAttribute('position', new THREE.BufferAttribute(underPositions, 3));
    underGeo.setAttribute('color', new THREE.BufferAttribute(underColors, 3));
    const underMat = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.floorUnderParticles = new THREE.Points(underGeo, underMat);
    this.scene.add(this.floorUnderParticles);
  }

  private pointInCorridor(x: number, z: number, seg: CorridorSegment, margin: number = 0.6): boolean {
    const halfW = seg.width / 2 + margin;
    if (Math.abs(seg.fromX - seg.toX) < 0.1) {
      const xOk = Math.abs(x - seg.fromX) <= halfW;
      const zMin = Math.min(seg.fromZ, seg.toZ) - margin;
      const zMax = Math.max(seg.fromZ, seg.toZ) + margin;
      const zOk = z >= zMin && z <= zMax;
      return xOk && zOk;
    } else {
      const zOk = Math.abs(z - seg.fromZ) <= halfW;
      const xMin = Math.min(seg.fromX, seg.toX) - margin;
      const xMax = Math.max(seg.fromX, seg.toX) + margin;
      const xOk = x >= xMin && x <= xMax;
      return xOk && zOk;
    }
  }

  private buildCorridors(): void {
    const bounds = this.labyrinthData.bounds;
    const w = bounds.maxX - bounds.minX + 12;
    const d = bounds.maxZ - bounds.minZ + 12;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;

    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x0e0e1e,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    const height = 3;

    this.labyrinthData.corridors.forEach((seg) => {
      if (Math.abs(seg.fromX - seg.toX) < 0.1) {
        const x0 = seg.fromX;
        const zMin = Math.min(seg.fromZ, seg.toZ);
        const zMax = Math.max(seg.fromZ, seg.toZ);
        const len = zMax - zMin;
        const zMid = (zMin + zMax) / 2;
        const halfW = seg.width / 2;

        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(len, height), wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(x0 - halfW, height / 2, zMid);
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(len, height), wallMat);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(x0 + halfW, height / 2, zMid);
        this.scene.add(rightWall);
      } else {
        const z0 = seg.fromZ;
        const xMin = Math.min(seg.fromX, seg.toX);
        const xMax = Math.max(seg.fromX, seg.toX);
        const len = xMax - xMin;
        const xMid = (xMin + xMax) / 2;
        const halfW = seg.width / 2;

        const topWall = new THREE.Mesh(new THREE.PlaneGeometry(len, height), wallMat);
        topWall.rotation.y = 0;
        topWall.position.set(xMid, height / 2, z0 - halfW);
        this.scene.add(topWall);

        const botWall = new THREE.Mesh(new THREE.PlaneGeometry(len, height), wallMat);
        botWall.rotation.y = Math.PI;
        botWall.position.set(xMid, height / 2, z0 + halfW);
        this.scene.add(botWall);
      }
    });
  }

  private buildCompassPoints(): void {
    this.labyrinthData.compassPoints.forEach((pt) => {
      const geo = new THREE.SphereGeometry(0.12, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pt.x, 2.2, pt.z);
      this.scene.add(mesh);
      this.compassMeshes.push(mesh);

      const light = new THREE.PointLight(0x00e5ff, 0.6, 5);
      light.position.set(pt.x, 2.2, pt.z);
      this.scene.add(light);
      this.compassLights.push(light);
    });
  }

  private isWalkable(x: number, z: number): boolean {
    for (const room of this.labyrinthData.rooms) {
      const half = room.size / 2;
      if (x >= room.centerX - half && x <= room.centerX + half &&
          z >= room.centerZ - half && z <= room.centerZ + half) {
        return true;
      }
    }
    for (const seg of this.labyrinthData.corridors) {
      if (this.pointInCorridor(x, z, seg, 0.3)) {
        return true;
      }
    }
    return false;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this.takeScreenshot();
      if (e.code === 'KeyR') {
        if (this.currentRoom) this.currentRoom.replay();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.renderer.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.cameraYaw -= e.movementX * 0.002;
      this.cameraPitch -= e.movementY * 0.002;
      this.cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraPitch));
    });
  }

  private buildUI(): void {
    const ui = document.createElement('div');
    ui.style.cssText = `
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    const hints = [
      { key: 'WASD', desc: '行走' },
      { key: '🖱️', desc: '环顾' },
      { key: 'E', desc: '保存截图' },
      { key: 'R', desc: '重播记忆' },
    ];
    hints.forEach((h) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 14px;
        background: rgba(0, 229, 255, 0.08);
        border: 1px solid rgba(0, 229, 255, 0.3);
        border-radius: 6px;
        color: rgba(0, 229, 255, 0.85);
        font-family: 'Courier New', monospace;
        font-size: 12px;
        backdrop-filter: blur(6px);
        transition: all 0.3s ease;
      `;
      const k = document.createElement('span');
      k.style.cssText = `
        font-weight: bold;
        color: #00E5FF;
        text-shadow: 0 0 8px rgba(0, 229, 255, 0.5);
        min-width: 40px;
      `;
      k.textContent = h.key;
      const d = document.createElement('span');
      d.style.cssText = 'opacity: 0.75;';
      d.textContent = h.desc;
      row.appendChild(k);
      row.appendChild(d);
      ui.appendChild(row);
    });
    document.body.appendChild(ui);

    const hintOverlay = document.createElement('div');
    hintOverlay.id = 'clickHint';
    hintOverlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 16px 32px;
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.4);
      border-radius: 8px;
      color: #00E5FF;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      letter-spacing: 0.15em;
      z-index: 60;
      backdrop-filter: blur(8px);
      text-shadow: 0 0 12px rgba(0, 229, 255, 0.6);
      transition: opacity 0.4s ease;
    `;
    hintOverlay.textContent = '点击屏幕开始探索记忆迷宫';
    document.body.appendChild(hintOverlay);

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      hintOverlay.style.opacity = locked ? '0' : '1';
    });
  }

  private fadeOutLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => loading.remove(), 700);
    }
  }

  private takeScreenshot(): void {
    if (this.isScreenshotting) return;
    this.isScreenshotting = true;
    this.screenshotLockTime = 1;

    const watermark = document.createElement('div');
    watermark.id = 'screenshotWm';
    watermark.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      padding: 8px 16px;
      background: rgba(0, 229, 255, 0.12);
      border: 1px solid rgba(0, 229, 255, 0.5);
      border-radius: 4px;
      color: #00E5FF;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      letter-spacing: 0.15em;
      z-index: 200;
      text-shadow: 0 0 10px rgba(0, 229, 255, 0.7);
      backdrop-filter: blur(4px);
      transition: opacity 0.3s ease;
      opacity: 0;
    `;
    watermark.textContent = `记忆迷宫 © ${new Date().getFullYear()}`;
    document.body.appendChild(watermark);
    requestAnimationFrame(() => {
      watermark.style.opacity = '1';
    });

    this.screenshotTimer = window.setTimeout(() => {
      this.renderer.render(this.scene, this.camera);
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `memory-labyrinth-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
      watermark.style.opacity = '0';
      setTimeout(() => watermark.remove(), 400);
      this.isScreenshotting = false;
      if (this.screenshotTimer) {
        clearTimeout(this.screenshotTimer);
        this.screenshotTimer = null;
      }
    }, 1000);
  }

  private update(delta: number): void {
    const time = this.clock.getElapsedTime();

    const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
    const move = new THREE.Vector3();
    const speed = 3.5 * delta;

    if (this.keys['KeyW']) move.add(forward);
    if (this.keys['KeyS']) move.sub(forward);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      const newX = this.camera.position.x + move.x;
      const newZ = this.camera.position.z + move.z;
      if (this.isWalkable(newX, this.camera.position.z)) {
        this.camera.position.x = newX;
      }
      if (this.isWalkable(this.camera.position.x, newZ)) {
        this.camera.position.z = newZ;
      }
    }

    if (!this.isScreenshotting) {
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.cameraYaw;
      this.camera.rotation.x = this.cameraPitch;
    }

    this.compassMeshes.forEach((m, i) => {
      m.position.y = 2.2 + Math.sin(time * 2 + i) * 0.15;
      m.rotation.y = time + i;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.4 * Math.abs(Math.sin(time * 3 + i));
    });

    const underPos = this.floorUnderParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = underPos.array as Float32Array;
    for (let i = 0; i < underPos.count; i++) {
      arr[i * 3] += Math.sin(time * 0.3 + i * 0.1) * 0.002;
      arr[i * 3 + 2] += Math.cos(time * 0.25 + i * 0.1) * 0.002;
    }
    underPos.needsUpdate = true;

    let foundRoom: MemoryRoom | null = null;
    const userPos = this.camera.position.clone();
    for (const room of this.memoryRooms) {
      if (room.containsPoint(userPos)) {
        foundRoom = room;
        break;
      }
    }
    if (foundRoom && foundRoom !== this.currentRoom) {
      this.currentRoom = foundRoom;
      foundRoom.triggerAnimation();
    }
    if (!foundRoom) {
      this.currentRoom = null;
    }

    this.memoryRooms.forEach((room) => {
      room.update(this.camera.position.clone(), delta);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };
}

new MemoryLabyrinthApp();
