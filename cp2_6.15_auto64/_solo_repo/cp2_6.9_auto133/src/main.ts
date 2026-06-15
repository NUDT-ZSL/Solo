import * as THREE from 'three';
import { RubiksCube, Move, Cubie, Axis, STEP } from './rubiksCube';
import { RotationAnimator } from './rotationAnimator';

type InteractionMode = 'none' | 'orbit' | 'drag-rotate';

interface DragState {
  active: boolean;
  axis: Axis | null;
  layer: number;
  group: THREE.Group | null;
  startAngle: number;
  currentAngle: number;
  planeNormal: THREE.Vector3;
  center: THREE.Vector3;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private container: HTMLElement;

  private rubiksCube: RubiksCube;
  private animator: RotationAnimator;
  private cubePivot: THREE.Group;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private hoveredCubie: Cubie | null = null;
  private selectedCubie: Cubie | null = null;

  private interactionMode: InteractionMode = 'none';
  private isMouseDown = false;
  private mouseDownPos = new THREE.Vector2();
  private mouseLastPos = new THREE.Vector2();
  private cameraTheta = Math.PI / 4;
  private cameraPhi = Math.PI / 3;
  private cameraDistance = 9;
  private cameraTarget = new THREE.Vector3(0, 0, 0);

  private dragState: DragState = {
    active: false,
    axis: null,
    layer: 0,
    group: null,
    startAngle: 0,
    currentAngle: 0,
    planeNormal: new THREE.Vector3(),
    center: new THREE.Vector3()
  };

  private indicatorRing: THREE.Mesh | null = null;

  private particles: THREE.Points;
  private particleData: { pos: THREE.Vector3; vel: THREE.Vector3 }[] = [];
  private glowRing: THREE.Mesh;

  private scrambleMoves: Move[] = [];
  private isScrambled = false;
  private currentProgress = 0;
  private totalMoves = 0;

  private actionBtn: HTMLButtonElement;
  private speedSelector: HTMLSelectElement;
  private progressBar: HTMLElement;
  private moveListEl: HTMLElement;
  private statusText: HTMLElement;

  private autoRotating = true;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1E1E2E);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.cubePivot = new THREE.Group();
    this.scene.add(this.cubePivot);

    this.rubiksCube = new RubiksCube();
    this.cubePivot.add(this.rubiksCube.group);

    this.animator = new RotationAnimator(this.rubiksCube);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.particles = this.createParticles();
    this.scene.add(this.particles);

    this.glowRing = this.createGlowRing();
    this.scene.add(this.glowRing);

    this.actionBtn = document.getElementById('action-btn') as HTMLButtonElement;
    this.speedSelector = document.getElementById('speed-selector') as HTMLSelectElement;
    this.progressBar = document.getElementById('progress-bar') as HTMLElement;
    this.moveListEl = document.getElementById('move-list') as HTMLElement;
    this.statusText = document.getElementById('status-text') as HTMLElement;

    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private createParticles(): THREE.Points {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const sphereRadius = 5;

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = sphereRadius * (0.8 + Math.random() * 0.4);

      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );

      this.particleData.push({ pos, vel });

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  private createGlowRing(): THREE.Mesh {
    const innerRadius = 2.2;
    const outerRadius = 3.2;
    const segments = 64;

    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(128, 128, 50, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 221, 136, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 136, 68, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.8;
    return ring;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    this.actionBtn.addEventListener('click', () => this.onActionClick());
    this.speedSelector.addEventListener('change', () => {
      const speed = parseFloat(this.speedSelector.value);
      this.animator.setSpeed(speed);
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private getMouseNDC(e: MouseEvent): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private pickCubie(e: MouseEvent): Cubie | null {
    const ndc = this.getMouseNDC(e);
    this.raycaster.setFromCamera(ndc, this.camera);

    const allMeshes: THREE.Object3D[] = [];
    this.rubiksCube.cubies.forEach(c => allMeshes.push(c.mesh));

    const intersects = this.raycaster.intersectObjects(allMeshes, true);

    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj && obj.parent !== this.rubiksCube.group) {
        obj = obj.parent;
      }
      if (obj) {
        const cubie = this.rubiksCube.cubies.find(c => c.mesh === obj);
        if (cubie) return cubie;
      }
    }
    return null;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.animator.getIsAnimating() && this.interactionMode !== 'drag-rotate') {
      return;
    }

    const ndc = this.getMouseNDC(e);
    this.mouse.copy(ndc);

    if (this.interactionMode === 'orbit' && this.isMouseDown) {
      const dx = e.clientX - this.mouseLastPos.x;
      const dy = e.clientY - this.mouseLastPos.y;

      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi - dy * 0.005));
      this.updateCameraPosition();

      this.mouseLastPos.set(e.clientX, e.clientY);
      return;
    }

    if (this.interactionMode === 'drag-rotate' && this.dragState.active && this.dragState.group) {
      this.updateDragRotation(e);
      return;
    }

    if (!this.isMouseDown) {
      const cubie = this.pickCubie(e);
      this.handleHover(cubie);
    }
  }

  private handleHover(cubie: Cubie | null): void {
    if (this.hoveredCubie && this.hoveredCubie !== cubie) {
      if (this.hoveredCubie !== this.selectedCubie) {
        this.rubiksCube.unhighlightCubie(this.hoveredCubie);
      }
      this.hoveredCubie = null;
    }

    if (cubie && cubie !== this.hoveredCubie && cubie !== this.selectedCubie) {
      this.rubiksCube.highlightCubie(cubie);
      this.hoveredCubie = cubie;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (this.animator.getIsAnimating()) return;

    this.isMouseDown = true;
    this.mouseDownPos.set(e.clientX, e.clientY);
    this.mouseLastPos.set(e.clientX, e.clientY);
    this.autoRotating = false;

    const cubie = this.pickCubie(e);

    if (cubie && this.selectedCubie === cubie) {
      this.startDragRotation(e, cubie);
    } else if (cubie) {
      if (this.selectedCubie && this.selectedCubie !== cubie) {
        this.rubiksCube.unhighlightCubie(this.selectedCubie);
      }
      this.selectedCubie = cubie;
      this.rubiksCube.highlightCubie(cubie);
      this.showIndicatorRing(cubie);
      this.interactionMode = 'none';
    } else {
      this.clearSelection();
      this.interactionMode = 'orbit';
    }
  }

  private clearSelection(): void {
    if (this.selectedCubie) {
      this.rubiksCube.unhighlightCubie(this.selectedCubie);
      this.selectedCubie = null;
    }
    this.hideIndicatorRing();
  }

  private showIndicatorRing(cubie: Cubie): void {
    this.hideIndicatorRing();

    const worldPos = new THREE.Vector3();
    cubie.mesh.getWorldPosition(worldPos);

    const absPos = new THREE.Vector3(
      Math.abs(worldPos.x),
      Math.abs(worldPos.y),
      Math.abs(worldPos.z)
    );

    let axis: Axis;
    if (absPos.x >= absPos.y && absPos.x >= absPos.z) axis = 'x';
    else if (absPos.y >= absPos.x && absPos.y >= absPos.z) axis = 'y';
    else axis = 'z';

    const ringGeo = new THREE.TorusGeometry(2.1, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });

    this.indicatorRing = new THREE.Mesh(ringGeo, ringMat);
    this.rubiksCube.group.add(this.indicatorRing);

    if (axis === 'x') this.indicatorRing.rotation.y = Math.PI / 2;
    else if (axis === 'z') this.indicatorRing.rotation.x = Math.PI / 2;
  }

  private hideIndicatorRing(): void {
    if (this.indicatorRing) {
      this.rubiksCube.group.remove(this.indicatorRing);
      this.indicatorRing.geometry.dispose();
      (this.indicatorRing.material as THREE.Material).dispose();
      this.indicatorRing = null;
    }
  }

  private startDragRotation(e: MouseEvent, cubie: Cubie): void {
    const worldPos = new THREE.Vector3();
    cubie.mesh.getWorldPosition(worldPos);
    const snappedPos = this.rubiksCube.getSnappedPosition(cubie);

    const absPos = new THREE.Vector3(
      Math.abs(snappedPos.x),
      Math.abs(snappedPos.y),
      Math.abs(snappedPos.z)
    );

    let axis: Axis;
    let layer: number;
    if (absPos.x >= absPos.y && absPos.x >= absPos.z) {
      axis = 'x';
      layer = snappedPos.x;
    } else if (absPos.y >= absPos.x && absPos.y >= absPos.z) {
      axis = 'y';
      layer = snappedPos.y;
    } else {
      axis = 'z';
      layer = snappedPos.z;
    }

    const group = this.animator.startDragRotation(axis, layer);

    const planeNormal = new THREE.Vector3();
    if (axis === 'x') planeNormal.set(1, 0, 0);
    else if (axis === 'y') planeNormal.set(0, 1, 0);
    else planeNormal.set(0, 0, 1);

    const center = new THREE.Vector3();
    if (axis === 'x') center.set(layer * STEP, 0, 0);
    else if (axis === 'y') center.set(0, layer * STEP, 0);
    else center.set(0, 0, layer * STEP);

    const worldCenter = center.clone();
    this.rubiksCube.group.localToWorld(worldCenter);

    this.dragState = {
      active: true,
      axis,
      layer,
      group,
      startAngle: 0,
      currentAngle: 0,
      planeNormal: planeNormal.clone(),
      center: worldCenter
    };

    this.hideIndicatorRing();
    this.interactionMode = 'drag-rotate';

    this.dragState.startAngle = this.getAngleOnPlane(e);
  }

  private getAngleOnPlane(e: MouseEvent): number {
    const ndc = this.getMouseNDC(e);
    this.raycaster.setFromCamera(ndc, this.camera);

    const normal = this.dragState.planeNormal.clone();
    this.cubePivot.localToWorld(normal);
    normal.sub(this.cubePivot.getWorldPosition(new THREE.Vector3())).normalize();

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, this.dragState.center);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersect);

    if (!intersect) return 0;

    const rel = intersect.clone().sub(this.dragState.center);

    let tangent1 = new THREE.Vector3();
    let tangent2 = new THREE.Vector3();
    if (this.dragState.axis === 'x') {
      tangent1.set(0, 1, 0);
      tangent2.set(0, 0, 1);
    } else if (this.dragState.axis === 'y') {
      tangent1.set(1, 0, 0);
      tangent2.set(0, 0, 1);
    } else {
      tangent1.set(1, 0, 0);
      tangent2.set(0, 1, 0);
    }

    const worldT1 = tangent1.clone();
    const worldT2 = tangent2.clone();
    this.cubePivot.localToWorld(worldT1);
    this.cubePivot.localToWorld(worldT2);
    worldT1.sub(this.cubePivot.getWorldPosition(new THREE.Vector3())).normalize();
    worldT2.sub(this.cubePivot.getWorldPosition(new THREE.Vector3())).normalize();

    const u = rel.dot(worldT1);
    const v = rel.dot(worldT2);
    return Math.atan2(v, u);
  }

  private updateDragRotation(e: MouseEvent): void {
    const angle = this.getAngleOnPlane(e);
    let delta = angle - this.dragState.startAngle;

    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    this.dragState.currentAngle += delta;
    this.dragState.startAngle = angle;

    if (this.dragState.group && this.dragState.axis) {
      this.animator.updateDragRotation(this.dragState.group, this.dragState.axis, this.dragState.currentAngle);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;
    this.autoRotating = true;

    if (this.interactionMode === 'drag-rotate' && this.dragState.active && this.dragState.group && this.dragState.axis) {
      const result = this.animator.snapToNearest90(this.dragState.group, this.dragState.axis);
      this.animator.finishDragRotation(this.dragState.axis, this.dragState.layer);

      if (Math.abs(result.snaps % 4) !== 0) {
        const notation = this.getNotationFromDrag(this.dragState.axis, this.dragState.layer, result.snaps);
        if (notation) {
          this.appendMoveToList(notation);
        }
      }
    }

    this.dragState = {
      active: false,
      axis: null,
      layer: 0,
      group: null,
      startAngle: 0,
      currentAngle: 0,
      planeNormal: new THREE.Vector3(),
      center: new THREE.Vector3()
    };
    this.interactionMode = 'none';

    if (this.selectedCubie) {
      this.showIndicatorRing(this.selectedCubie);
    }
  }

  private getNotationFromDrag(axis: Axis, layer: number, snaps: number): string | null {
    let face = '';
    let direction = snaps > 0 ? 1 : -1;
    const absSnaps = Math.abs(snaps) % 4;

    if (axis === 'y' && layer === 1) face = 'U';
    else if (axis === 'y' && layer === -1) face = 'D';
    else if (axis === 'x' && layer === 1) face = 'R';
    else if (axis === 'x' && layer === -1) face = 'L';
    else if (axis === 'z' && layer === 1) face = 'F';
    else if (axis === 'z' && layer === -1) face = 'B';

    if (!face) return null;

    if (face === 'D' || face === 'L' || face === 'B') {
      direction = direction * -1;
    }

    if (absSnaps === 2) return face + '2';
    if (direction > 0) return face;
    return face + "'";
  }

  private appendMoveToList(notation: string): void {
    const current = this.moveListEl.textContent || '';
    const parts = current ? current.split(', ') : [];
    parts.push(notation);
    this.moveListEl.textContent = parts.join(', ');
    this.moveListEl.scrollTop = this.moveListEl.scrollHeight;
  }

  private onActionClick(): void {
    if (this.animator.getIsAnimating()) return;

    if (!this.isScrambled) {
      this.startScramble();
    } else {
      this.startSolve();
    }
  }

  private startScramble(): void {
    this.clearSelection();
    this.scrambleMoves = RubiksCube.generateScrambleMoves(20);
    this.totalMoves = this.scrambleMoves.length;
    this.currentProgress = 0;
    this.moveListEl.textContent = '';
    this.statusText.textContent = '打乱中...';
    this.updateProgressBar(0);

    this.actionBtn.disabled = true;
    const speed = this.animator.getSpeed();

    this.animator.enqueueMoves(
      this.scrambleMoves,
      400 / speed,
      300 / speed,
      (index, move) => {
        this.currentProgress = index + 1;
        this.updateProgressBar(this.currentProgress / this.totalMoves);
        this.appendMoveToList(move.notation);
      },
      () => {
        this.isScrambled = true;
        this.actionBtn.disabled = false;
        this.actionBtn.textContent = '还原';
        this.statusText.textContent = '已打乱，点击还原';
      }
    );
  }

  private startSolve(): void {
    this.clearSelection();
    const solveMoves = RubiksCube.generateSolveMoves(this.scrambleMoves);
    this.totalMoves = solveMoves.length;
    this.currentProgress = 0;
    this.moveListEl.textContent = '';
    this.statusText.textContent = '还原中...';
    this.updateProgressBar(0);

    this.actionBtn.disabled = true;
    const speed = this.animator.getSpeed();

    this.animator.enqueueMoves(
      solveMoves,
      400 / speed,
      300 / speed,
      (index, move) => {
        this.currentProgress = index + 1;
        this.updateProgressBar(this.currentProgress / this.totalMoves);
        this.appendMoveToList(move.notation);
      },
      () => {
        this.isScrambled = false;
        this.scrambleMoves = [];
        this.actionBtn.disabled = false;
        this.actionBtn.textContent = '打乱';
        this.statusText.textContent = '已还原！';
      }
    );
  }

  private updateProgressBar(progress: number): void {
    this.progressBar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }

  private updateParticles(delta: number): void {
    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const sphereRadius = 5;

    for (let i = 0; i < this.particleData.length; i++) {
      const p = this.particleData[i];
      p.pos.add(p.vel.clone().multiplyScalar(delta));

      const dist = p.pos.length();
      if (dist > sphereRadius * 1.3 || dist < sphereRadius * 0.6) {
        p.vel.negate();
        p.pos.normalize().multiplyScalar(sphereRadius);
      }

      p.vel.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ));
      p.vel.clampLength(0, 0.5);

      posArray[i * 3] = p.pos.x;
      posArray[i * 3 + 1] = p.pos.y;
      posArray[i * 3 + 2] = p.pos.z;
    }

    positions.needsUpdate = true;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    if (this.autoRotating && !this.animator.getIsAnimating() && this.interactionMode === 'none') {
      this.cubePivot.rotation.y += 0.5 * delta * (Math.PI / 180) * 60;
    }

    this.animator.update(delta);
    this.updateParticles(delta);

    const t = performance.now() * 0.0005;
    this.glowRing.rotation.z = t;

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
