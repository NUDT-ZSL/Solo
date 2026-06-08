import * as THREE from 'three';
import { TreeFiber } from './TreeFiber';
import { ParticleSystem } from './ParticleSystem';
import { ControlPanel, ControlState } from './ControlPanel';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private treeFiber: TreeFiber;
  private particleSystem: ParticleSystem;
  private controlPanel: ControlPanel;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private connectionLines: THREE.LineSegments | null = null;
  private autoRotateAngle: number = 0;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngleX: number = 0.3;
  private cameraAngleY: number = 0;
  private cameraDistance: number = 18;
  private controlState: ControlState;
  private haloRing: THREE.Mesh;
  private lastClickTime: number = 0;
  private lastClickPos: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050a1a, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x020818, 1);
    document.body.appendChild(this.renderer.domElement);

    this.addBackground();

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.treeFiber = new TreeFiber(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);

    this.controlPanel = new ControlPanel();
    this.controlState = this.controlPanel.getState();
    this.controlPanel.onChange((state) => {
      this.controlState = state;
      this.particleSystem.targetDensity = state.particleDensity;
      this.updateConnectionLines(state.showConnections);
    });

    const haloGeo = new THREE.TorusGeometry(5, 0.03, 8, 128);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4080ff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloRing = new THREE.Mesh(haloGeo, haloMat);
    this.haloRing.rotation.x = Math.PI / 2;
    this.haloRing.position.y = 7;
    this.scene.add(this.haloRing);

    const haloGeo2 = new THREE.TorusGeometry(7, 0.02, 8, 128);
    const haloMat2 = new THREE.MeshBasicMaterial({
      color: 0x3060cc,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloRing2 = new THREE.Mesh(haloGeo2, haloMat2);
    haloRing2.rotation.x = Math.PI / 2;
    haloRing2.position.y = 7;
    this.scene.add(haloRing2);

    this.setupInteraction();
    this.animate();
  }

  private addBackground() {
    const bgGeo = new THREE.SphereGeometry(50, 32, 32);
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform float uTime;
        void main() {
          float t = clamp((vWorldPos.y + 50.0) / 100.0, 0.0, 1.0);
          vec3 deepBlue = vec3(0.01, 0.02, 0.08);
          vec3 midBlue = vec3(0.02, 0.04, 0.12);
          vec3 col = mix(deepBlue, midBlue, t);
          float pulse = 0.5 + 0.5 * sin(uTime * 0.3 + vWorldPos.y * 0.05);
          col += vec3(0.01, 0.015, 0.04) * pulse;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.name = 'background';
    this.scene.add(bgMesh);
  }

  private updateCameraPosition() {
    const x = Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
    const y = Math.sin(this.cameraAngleX) * this.cameraDistance + 7;
    const z = Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 7, 0);
  }

  private setupInteraction() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.cameraAngleY -= dx * 0.005;
      this.cameraAngleX += dy * 0.005;
      this.cameraAngleX = THREE.MathUtils.clamp(this.cameraAngleX, -0.5, 1.2);
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.updateCameraPosition();
    });

    canvas.addEventListener('mouseup', (e) => {
      const dx = Math.abs(e.clientX - this.previousMouse.x);
      const dy = Math.abs(e.clientY - this.previousMouse.y);
      const wasDrag = dx > 3 || dy > 3;
      this.isDragging = false;

      if (!wasDrag) {
        const now = performance.now();
        const dt = now - this.lastClickTime;
        const samePos =
          Math.abs(e.clientX - this.lastClickPos.x) < 5 &&
          Math.abs(e.clientY - this.lastClickPos.y) < 5;

        if (dt < 300 && samePos) {
          this.handleDoubleClick(e);
          this.lastClickTime = 0;
        } else {
          this.lastClickTime = now;
          this.lastClickPos = { x: e.clientX, y: e.clientY };
          this.handleClick(e);
        }
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.01;
      this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance, 8, 35);
      this.updateCameraPosition();
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private handleClick(e: MouseEvent) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.treeFiber.fibers.map((f) => f.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const fiberIndex = this.treeFiber.fibers.findIndex((f) => f.mesh === hitMesh);
      if (fiberIndex >= 0) {
        this.treeFiber.pulseFiber(fiberIndex);
        const fiber = this.treeFiber.fibers[fiberIndex];
        const point = fiber.curve.getPoint(0.5);
        const blendColor = fiber.baseColor.clone().lerp(fiber.tipColor, 0.5);
        this.particleSystem.emitFromPoint(point, blendColor, 20);
      }
    }
  }

  private handleDoubleClick(e: MouseEvent) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion), 0);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, target);

    if (target) {
      this.treeFiber.shockwave(target, 6);
      this.particleSystem.emitFromPoint(target, new THREE.Color(0.5, 0.7, 1.0), 40);
    }
  }

  private updateConnectionLines(show: boolean) {
    if (show && !this.connectionLines) {
      const points: number[] = [];
      const midpoints = this.treeFiber.getFiberMidpoints();
      for (let i = 0; i < this.treeFiber.fibers.length; i++) {
        const fiber = this.treeFiber.fibers[i];
        for (const ni of fiber.neighbors) {
          if (ni > i) {
            points.push(midpoints[i].x, midpoints[i].y, midpoints[i].z);
            points.push(midpoints[ni].x, midpoints[ni].y, midpoints[ni].z);
          }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x4080cc,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.connectionLines = new THREE.LineSegments(geo, mat);
      this.scene.add(this.connectionLines);
    } else if (!show && this.connectionLines) {
      this.scene.remove(this.connectionLines);
      this.connectionLines.geometry.dispose();
      (this.connectionLines.material as THREE.Material).dispose();
      this.connectionLines = null;
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.autoRotateAngle += delta * 0.08;
    this.cameraAngleY += delta * 0.02;
    this.updateCameraPosition();

    this.treeFiber.update(time, this.controlState.flowSpeed, this.controlState.showConnections);
    this.particleSystem.update(time, this.controlState.flowSpeed, delta);

    this.haloRing.rotation.z = time * 0.15;
    this.haloRing.material.opacity = 0.1 + 0.05 * Math.sin(time * 0.8);

    const bgMesh = this.scene.getObjectByName('background');
    if (bgMesh) {
      const mat = (bgMesh as THREE.Mesh).material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = time;
    }

    if (this.connectionLines) {
      (this.connectionLines.material as THREE.LineBasicMaterial).opacity =
        0.08 + 0.04 * Math.sin(time * 1.2);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
