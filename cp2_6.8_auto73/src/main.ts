import * as THREE from 'three';
import { Gallery, type FrameData, type FrameUpdate, type WallId, type UserData, type ChatMessage } from './gallery';
import { RoomManager } from './roomManager';
import { UIManager, type ViewMode } from './ui';

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 5;
const ROOM_DEPTH = 20;
const WALL_THICKNESS = 0.2;
const FRAME_ASPECT = 1.5 / 2;
const TRANSITION_DURATION = 500;

interface FrameObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  border: THREE.Mesh;
  texture: THREE.Texture | null;
  loadingRing: THREE.Mesh | null;
  target: { position: THREE.Vector3; rotation: number; scale: THREE.Vector3 };
  start: { position: THREE.Vector3; rotation: number; scale: THREE.Vector3 };
  transitionStart: number;
  transitioning: boolean;
  data: FrameData;
}

class GalleryApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private overheadCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;

  private gallery: Gallery;
  private roomManager: RoomManager;
  private ui: UIManager;

  private frameObjects: Map<string, FrameObject> = new Map();
  private wallMeshes: Map<WallId, THREE.Mesh> = new Map();
  private wallGlowMaterials: Map<WallId, THREE.MeshBasicMaterial> = new Map();

  private viewMode: ViewMode = 'firstPerson';
  private keys: Record<string, boolean> = {};
  private yaw = 0;
  private pitch = 0;
  private isPointerLocked = false;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private cameraPos = new THREE.Vector3(0, 1.6, 8);
  private playerVelocity = new THREE.Vector3();

  private textureCache: Map<string, THREE.Texture> = new Map();
  private selectedFrameId: string | null = null;
  private hoverWallId: WallId | null = null;
  private hoverPoint: THREE.Vector3 | null = null;
  private previewFrame: THREE.Group | null = null;
  private pendingWall: WallId | null = null;

  private clock = new THREE.Clock();

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1E1E2E);
    this.scene.fog = new THREE.Fog(0x1E1E2E, 15, 40);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.copy(this.cameraPos);

    this.overheadCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    this.overheadCamera.position.set(0, 18, 14);
    this.overheadCamera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.gallery = new Gallery();
    this.roomManager = new RoomManager();
    this.ui = new UIManager(document.getElementById('ui-container')!);

    this.setupLights();
    this.setupRoom();
    this.setupEvents();
    this.setupGalleryCallbacks();
    this.setupRoomManagerCallbacks();
    this.setupUICallbacks();

    this.ui.showJoinDialog();
    this.animate();
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -15;
    dir.shadow.camera.right = 15;
    dir.shadow.camera.top = 15;
    dir.shadow.camera.bottom = -15;
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0xA78BFA, 0.25);
    fill.position.set(-5, 5, -5);
    this.scene.add(fill);

    const ceilingLight = new THREE.PointLight(0xA78BFA, 0.4, 30);
    ceilingLight.position.set(0, ROOM_HEIGHT - 0.5, 0);
    this.scene.add(ceilingLight);
  }

  private setupRoom() {
    const gridHelper = new THREE.GridHelper(ROOM_WIDTH, ROOM_WIDTH, 0x2D2D2D, 0x2D2D2D);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.8;
    this.scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1E1E2E, roughness: 0.95 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceilingGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x252538, roughness: 0.9 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    this.scene.add(ceiling);

    const wallColor = 0xF5F0E8;

    const northWall = this.createWall(ROOM_WIDTH, ROOM_HEIGHT, wallColor, 'north');
    northWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    this.scene.add(northWall);
    this.wallMeshes.set('north', northWall);

    const southWall = this.createWall(ROOM_WIDTH, ROOM_HEIGHT, wallColor, 'south');
    southWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    southWall.rotation.y = Math.PI;
    this.scene.add(southWall);
    this.wallMeshes.set('south', southWall);

    const eastWall = this.createWall(ROOM_DEPTH, ROOM_HEIGHT, wallColor, 'east');
    eastWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    eastWall.rotation.y = -Math.PI / 2;
    this.scene.add(eastWall);
    this.wallMeshes.set('east', eastWall);

    const westWall = this.createWall(ROOM_DEPTH, ROOM_HEIGHT, wallColor, 'west');
    westWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    westWall.rotation.y = Math.PI / 2;
    this.scene.add(westWall);
    this.wallMeshes.set('west', westWall);
  }

  private createWall(width: number, height: number, color: number, id: WallId): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, height, WALL_THICKNESS);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.userData.wallId = id;
    mesh.userData.isWall = true;

    const glowGeo = new THREE.BoxGeometry(width * 0.98, height * 0.98, WALL_THICKNESS + 0.01);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xA78BFA, transparent: true, opacity: 0, side: THREE.BackSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    mesh.add(glow);
    this.wallGlowMaterials.set(id, glowMat);

    return mesh;
  }

  private setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.overheadCamera.aspect = window.innerWidth / window.innerHeight;
      this.overheadCamera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (this.viewMode === 'firstPerson') {
        if (e.button === 0) {
          this.renderer.domElement.requestPointerLock?.();
        }
      } else {
        if (e.button === 0) {
          this.isDragging = true;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
        } else if (e.button === 2) {
          this.isDragging = true;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
        }
      }
    });

    this.renderer.domElement.addEventListener('mouseup', (e) => {
      if (this.viewMode === 'overhead') {
        if (this.isDragging && e.button === 0) {
          const dx = Math.abs(e.clientX - this.lastMouseX);
          const dy = Math.abs(e.clientY - this.lastMouseY);
          if (dx < 3 && dy < 3) {
            this.handleClick(e);
          }
        }
        this.isDragging = false;
      }
    });

    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this.updateMouse(e);
      if (this.viewMode === 'overhead' && this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        if (e.buttons === 2) {
          const panSpeed = 0.03;
          this.overheadCamera.position.x -= dx * panSpeed;
          this.overheadCamera.position.z -= dy * panSpeed;
          this.overheadCamera.lookAt(this.overheadCamera.position.x, 0, this.overheadCamera.position.z - 14);
        } else if (e.buttons === 1) {
          const rotSpeed = 0.005;
          const center = new THREE.Vector3(this.overheadCamera.position.x, 0, this.overheadCamera.position.z - 14);
          const offset = new THREE.Vector3().subVectors(this.overheadCamera.position, center);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dx * rotSpeed);
          this.overheadCamera.position.copy(center).add(offset);
          this.overheadCamera.lookAt(center);
        }
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
      this.updateHover();
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      if (this.viewMode === 'overhead') {
        e.preventDefault();
        const zoomSpeed = e.deltaY * 0.01;
        const dir = new THREE.Vector3(0, -1, 0.8).normalize();
        this.overheadCamera.position.addScaledVector(dir, zoomSpeed);
        this.overheadCamera.position.y = Math.max(6, Math.min(35, this.overheadCamera.position.y));
      }
    }, { passive: false });

    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.viewMode === 'firstPerson') {
        this.handleClick(e);
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked && this.viewMode === 'firstPerson') {
        this.yaw -= e.movementX * 0.002;
        this.pitch -= e.movementY * 0.002;
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
      }
    });
  }

  private updateMouse(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(e: MouseEvent) {
    this.updateMouse(e);
    const activeCamera = this.viewMode === 'firstPerson' ? this.camera : this.overheadCamera;
    this.raycaster.setFromCamera(this.mouse, activeCamera);

    const frameMeshes = Array.from(this.frameObjects.values()).map(f => f.mesh);
    const frameIntersects = this.raycaster.intersectObjects(frameMeshes, false);
    if (frameIntersects.length > 0) {
      const frameId = frameIntersects[0].object.userData.frameId as string;
      this.selectFrame(frameId);
      return;
    }

    const walls = Array.from(this.wallMeshes.values());
    const wallIntersects = this.raycaster.intersectObjects(walls, false);
    if (wallIntersects.length > 0) {
      const wall = wallIntersects[0].object as THREE.Mesh;
      const wallId = wall.userData.wallId as WallId;
      const point = wallIntersects[0].point;
      this.pendingWall = wallId;
      this.hoverPoint = point;
      this.ui.showImagePicker(wallId);
    }
  }

  private updateHover() {
    const activeCamera = this.viewMode === 'firstPerson' ? this.camera : this.overheadCamera;
    this.raycaster.setFromCamera(this.mouse, activeCamera);

    this.wallGlowMaterials.forEach(mat => { mat.opacity = Math.max(0, mat.opacity - 0.05); });

    const walls = Array.from(this.wallMeshes.values());
    const intersects = this.raycaster.intersectObjects(walls, false);
    if (intersects.length > 0) {
      const wallId = intersects[0].object.userData.wallId as WallId;
      this.hoverWallId = wallId;
      this.hoverPoint = intersects[0].point;
      const glow = this.wallGlowMaterials.get(wallId);
      if (glow) glow.opacity = 0.08;
      this.renderer.domElement.style.cursor = 'pointer';
      this.updatePreviewFrame();
    } else {
      this.hoverWallId = null;
      this.hoverPoint = null;
      this.renderer.domElement.style.cursor = 'default';
      this.hidePreviewFrame();
    }

    const dist = this.cameraPos.length();
    this.wallGlowMaterials.forEach((mat, id) => {
      const wallPos = this.getWallCenter(id);
      const d = this.cameraPos.distanceTo(wallPos);
      if (d < 5) {
        mat.opacity = Math.max(mat.opacity, 0.05 * (1 - (d - 2) / 3));
      }
    });
  }

  private getWallCenter(id: WallId): THREE.Vector3 {
    switch (id) {
      case 'north': return new THREE.Vector3(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
      case 'south': return new THREE.Vector3(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
      case 'east': return new THREE.Vector3(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
      case 'west': return new THREE.Vector3(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    }
  }

  private updatePreviewFrame() {
    if (!this.hoverWallId || !this.hoverPoint) return;
    if (!this.previewFrame) {
      this.previewFrame = new THREE.Group();
      const defaultImg = this.createPlaceholderTexture();
      const tex = new THREE.CanvasTexture(defaultImg);
      const geo = new THREE.PlaneGeometry(2, 1.5);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      this.previewFrame.add(mesh);
      this.scene.add(this.previewFrame);
    }
    this.positionFrameOnWall(this.previewFrame, this.hoverWallId, this.hoverPoint);
  }

  private hidePreviewFrame() {
    if (this.previewFrame) {
      this.scene.remove(this.previewFrame);
      this.previewFrame = null;
    }
  }

  private createPlaceholderTexture(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 192;
    const ctx = c.getContext('2d')!;
    const grd = ctx.createLinearGradient(0, 0, 256, 192);
    grd.addColorStop(0, '#3A3A5C');
    grd.addColorStop(1, '#2A2A3C');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 192);
    ctx.fillStyle = '#A78BFA';
    ctx.globalAlpha = 0.3;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', 128, 115);
    return c;
  }

  private positionFrameOnWall(group: THREE.Group, wallId: WallId, worldPoint: THREE.Vector3) {
    const hw = ROOM_WIDTH / 2 - 1;
    const hd = ROOM_DEPTH / 2 - 1;
    const y = Math.max(1.25, Math.min(ROOM_HEIGHT - 1.5, worldPoint.y));
    group.position.y = y;

    switch (wallId) {
      case 'north':
        group.position.x = Math.max(-hw, Math.min(hw, worldPoint.x));
        group.position.z = -ROOM_DEPTH / 2 + 0.05;
        group.rotation.set(0, 0, 0);
        break;
      case 'south':
        group.position.x = Math.max(-hw, Math.min(hw, worldPoint.x));
        group.position.z = ROOM_DEPTH / 2 - 0.05;
        group.rotation.set(0, Math.PI, 0);
        break;
      case 'east':
        group.position.z = Math.max(-hd, Math.min(hd, worldPoint.z));
        group.position.x = ROOM_WIDTH / 2 - 0.05;
        group.rotation.set(0, -Math.PI / 2, 0);
        break;
      case 'west':
        group.position.z = Math.max(-hd, Math.min(hd, worldPoint.z));
        group.position.x = -ROOM_WIDTH / 2 + 0.05;
        group.rotation.set(0, Math.PI / 2, 0);
        break;
    }
  }

  private getWallPositionParams(wallId: WallId, pos: THREE.Vector3): { positionX: number; positionY: number } {
    const hw = ROOM_WIDTH / 2;
    const hd = ROOM_DEPTH / 2;
    let positionX = 0;
    switch (wallId) {
      case 'north':
      case 'south':
        positionX = (pos.x + hw) / ROOM_WIDTH;
        break;
      case 'east':
      case 'west':
        positionX = (pos.z + hd) / ROOM_DEPTH;
        break;
    }
    return { positionX, positionY: pos.y };
  }

  private setupGalleryCallbacks() {
    this.gallery.setCallbacks({
      onFrameAdded: (frame) => this.createFrameObject(frame),
      onFrameUpdated: (id, update) => this.updateFrameObject(id, update),
      onFrameRemoved: (id) => this.removeFrameObject(id),
      onUserJoined: (user) => {
        this.ui.updateUsers(this.gallery.getAllUsers(), this.gallery.currentUserId);
      },
      onUserLeft: (userId) => {
        this.ui.updateUsers(this.gallery.getAllUsers(), this.gallery.currentUserId);
      },
      onUserStatusChanged: () => {
        this.ui.updateUsers(this.gallery.getAllUsers(), this.gallery.currentUserId);
      },
      onMessageReceived: (msg) => {
        this.ui.addChatMessage(msg, msg.userId === this.gallery.currentUserId);
      },
      onStateSynced: () => {
        this.ui.updateUsers(this.gallery.getAllUsers(), this.gallery.currentUserId);
        this.gallery.getMessages().forEach(m => {
          this.ui.addChatMessage(m, m.userId === this.gallery.currentUserId);
        });
      }
    });
  }

  private setupRoomManagerCallbacks() {
    this.roomManager.setCallbacks({
      onConnected: () => {
        this.ui.hideLoading();
        this.ui.buildMainUI(this.roomManager.getRoomCode(), this.gallery.currentUserNickname);
        this.ui.updateUsers(this.gallery.getAllUsers(), this.gallery.currentUserId);
      },
      onRoomState: (frames, users, messages) => {
        this.gallery.syncState(frames, users, messages);
      },
      onUserJoined: (user) => {
        this.gallery.addUser(user);
      },
      onUserLeft: (userId) => {
        this.gallery.removeUser(userId);
      },
      onUserStatus: (userId, online) => {
        this.gallery.setUserStatus(userId, online);
      },
      onFramePlaced: (frame) => {
        this.gallery.addFrame(frame);
      },
      onFrameUpdated: (id, update) => {
        this.gallery.updateFrame(id, update);
      },
      onFrameDeleted: (id) => {
        this.gallery.removeFrame(id);
        if (this.selectedFrameId === id) {
          this.selectedFrameId = null;
          this.ui.removeEditPanel();
        }
      },
      onChatMessage: (msg) => {
        this.gallery.addMessage(msg);
      },
      onError: (err) => {
        this.ui.showJoinError(err);
        this.ui.showToast(err, 'error');
      }
    });
  }

  private setupUICallbacks() {
    this.ui.setCallbacks({
      onJoinRoom: (roomCode, nickname) => {
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        this.gallery.setCurrentUser(userId, nickname);
        this.gallery.setRoomCode(roomCode);
        const ok = this.roomManager.connect(roomCode, userId, nickname);
        if (!ok) {
          // error handled via callback
        }
      },
      onViewModeChange: (mode) => {
        this.setViewMode(mode);
      },
      onSendMessage: (content) => {
        this.roomManager.sendMessage(content);
      },
      onFrameWidthChange: (id, width) => {
        const height = width * FRAME_ASPECT;
        this.roomManager.updateFrame(id, { width, height });
      },
      onFrameRotationChange: (id, rotation) => {
        this.roomManager.updateFrame(id, { rotation });
      },
      onFrameHeightChange: (id, positionY) => {
        this.roomManager.updateFrame(id, { positionY });
      },
      onFrameImageChange: (id, imageData) => {
        this.roomManager.updateFrame(id, { imageData });
      },
      onFrameDelete: (id) => {
        this.roomManager.deleteFrame(id);
        this.ui.removeEditPanel();
      },
      onCloseEditPanel: () => {
        this.ui.removeEditPanel();
        this.selectedFrameId = null;
      },
      onPlaceFrame: (wallId, imageData) => {
        if (this.hoverPoint) {
          const params = this.getWallPositionParams(wallId, this.hoverPoint);
          const posY = Math.max(0.5, Math.min(3, params.positionY));
          this.roomManager.placeFrame(wallId, params.positionX, posY, imageData);
        } else {
          this.roomManager.placeFrame(wallId, 0.5, 1.5, imageData);
        }
        this.pendingWall = null;
      }
    });
  }

  private setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.ui.updateHintsForView(mode);
    if (mode === 'overhead') {
      document.exitPointerLock?.();
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private selectFrame(frameId: string) {
    this.selectedFrameId = frameId;
    const frame = this.gallery.getFrame(frameId);
    if (frame) {
      this.ui.showEditPanel(frame);
    }
  }

  private createFrameObject(data: FrameData) {
    const group = new THREE.Group();
    group.userData.frameId = data.id;

    const aspect = data.height / data.width;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = Math.round(32 * aspect);
    const ctx = canvas.getContext('2d')!;
    const segments = 24;
    const radius = 12;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(167,139,250,0.9)' : 'rgba(167,139,250,0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, a, a + Math.PI * 1.2);
      ctx.stroke();
    }

    const geo = new THREE.PlaneGeometry(data.width, data.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.frameId = data.id;
    mesh.userData.isFrame = true;
    group.add(mesh);

    const borderThickness = 0.05;
    const borderGeo = new THREE.BoxGeometry(data.width + borderThickness * 2, data.height + borderThickness * 2, borderThickness);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x5D2E0C, roughness: 0.7, metalness: 0.1 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.z = -0.025;
    border.castShadow = true;
    group.add(border);

    this.applyFramePosition(group, data);

    const loadingTex = tex;
    const loadingRing: THREE.Mesh | null = null;
    this.loadImageAsync(data.imageData, data.id, (loadedTex) => {
      (mesh.material as THREE.MeshBasicMaterial).map = loadedTex;
      (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      loadingTex.dispose();
    });

    const frameObj: FrameObject = {
      group,
      mesh,
      border,
      texture: tex,
      loadingRing,
      target: {
        position: group.position.clone(),
        rotation: data.rotation,
        scale: group.scale.clone()
      },
      start: {
        position: group.position.clone(),
        rotation: data.rotation,
        scale: group.scale.clone()
      },
      transitionStart: performance.now(),
      transitioning: false,
      data
    };

    this.frameObjects.set(data.id, frameObj);
    this.scene.add(group);
  }

  private loadImageAsync(imageData: string, frameId: string, onLoad: (tex: THREE.Texture) => void) {
    if (this.textureCache.has(imageData)) {
      onLoad(this.textureCache.get(imageData)!);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(imageData, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.textureCache.set(imageData, tex);
      onLoad(tex);
    }, undefined, () => {
      // error, use placeholder
      const c = this.createPlaceholderTexture();
      const tex = new THREE.CanvasTexture(c);
      onLoad(tex);
    });
  }

  private applyFramePosition(group: THREE.Group, data: FrameData) {
    const hw = ROOM_WIDTH / 2;
    const hd = ROOM_DEPTH / 2;
    const y = data.positionY + data.height / 2;
    group.position.y = y;

    switch (data.wallId) {
      case 'north':
        group.position.x = -hw + data.positionX * ROOM_WIDTH;
        group.position.z = -ROOM_DEPTH / 2 + 0.05;
        group.rotation.set(0, 0, THREE.MathUtils.degToRad(data.rotation));
        break;
      case 'south':
        group.position.x = -hw + data.positionX * ROOM_WIDTH;
        group.position.z = ROOM_DEPTH / 2 - 0.05;
        group.rotation.set(0, Math.PI, THREE.MathUtils.degToRad(data.rotation));
        break;
      case 'east':
        group.position.z = -hd + data.positionX * ROOM_DEPTH;
        group.position.x = ROOM_WIDTH / 2 - 0.05;
        group.rotation.set(0, -Math.PI / 2, THREE.MathUtils.degToRad(data.rotation));
        break;
      case 'west':
        group.position.z = -hd + data.positionX * ROOM_DEPTH;
        group.position.x = -ROOM_WIDTH / 2 + 0.05;
        group.rotation.set(0, Math.PI / 2, THREE.MathUtils.degToRad(data.rotation));
        break;
    }
  }

  private updateFrameObject(id: string, update: FrameUpdate) {
    const obj = this.frameObjects.get(id);
    if (!obj) return;
    Object.assign(obj.data, update);

    const oldPos = obj.group.position.clone();
    const oldRot = obj.data.rotation;
    const oldScale = obj.group.scale.clone();

    if (update.width !== undefined || update.height !== undefined) {
      const w = obj.data.width;
      const h = obj.data.height;
      obj.mesh.geometry.dispose();
      obj.mesh.geometry = new THREE.PlaneGeometry(w, h);
      obj.border.geometry.dispose();
      const bt = 0.05;
      obj.border.geometry = new THREE.BoxGeometry(w + bt * 2, h + bt * 2, bt);
    }

    this.applyFramePosition(obj.group, obj.data);

    obj.start.position.copy(oldPos);
    obj.start.rotation = oldRot;
    obj.start.scale.copy(oldScale);
    obj.target.position.copy(obj.group.position);
    obj.target.rotation = obj.data.rotation;
    obj.target.scale.copy(obj.group.scale);
    obj.group.position.copy(oldPos);
    obj.transitioning = true;
    obj.transitionStart = performance.now();
  }

  private removeFrameObject(id: string) {
    const obj = this.frameObjects.get(id);
    if (obj) {
      this.scene.remove(obj.group);
      obj.mesh.geometry.dispose();
      (obj.mesh.material as THREE.Material).dispose();
      obj.border.geometry.dispose();
      (obj.border.material as THREE.Material).dispose();
      if (obj.texture) obj.texture.dispose();
      this.frameObjects.delete(id);
    }
  }

  private updateFirstPersonMovement(dt: number) {
    if (!this.isPointerLocked && this.viewMode === 'firstPerson') return;

    const speed = 6 * dt;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(forward);
    if (this.keys['KeyS']) move.sub(forward);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      const newPos = this.cameraPos.clone().add(move);
      const margin = 0.6;
      const hw = ROOM_WIDTH / 2 - margin;
      const hd = ROOM_DEPTH / 2 - margin;
      newPos.x = Math.max(-hw, Math.min(hw, newPos.x));
      newPos.z = Math.max(-hd, Math.min(hd, newPos.z));
      this.cameraPos.copy(newPos);
    }

    this.camera.position.copy(this.cameraPos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private updateTransitions(now: number) {
    this.frameObjects.forEach(obj => {
      if (!obj.transitioning) return;
      const t = Math.min(1, (now - obj.transitionStart) / TRANSITION_DURATION);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      obj.group.position.lerpVectors(obj.start.position, obj.target.position, ease);

      const rad = THREE.MathUtils.degToRad(obj.target.rotation);
      const startRad = THREE.MathUtils.degToRad(obj.start.rotation);
      const currentRot = startRad + (rad - startRad) * ease;

      switch (obj.data.wallId) {
        case 'north':
          obj.group.rotation.set(0, 0, currentRot);
          break;
        case 'south':
          obj.group.rotation.set(0, Math.PI, currentRot);
          break;
        case 'east':
          obj.group.rotation.set(0, -Math.PI / 2, currentRot);
          break;
        case 'west':
          obj.group.rotation.set(0, Math.PI / 2, currentRot);
          break;
      }

      if (t >= 1) {
        obj.transitioning = false;
      }
    });
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const now = performance.now();

    if (this.viewMode === 'firstPerson') {
      this.updateFirstPersonMovement(dt);
      this.renderer.render(this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.overheadCamera);
    }

    this.updateTransitions(now);
  };
}

new GalleryApp();
