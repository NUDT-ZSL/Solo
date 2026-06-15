import * as THREE from 'three';
import { RayTracer } from './RayTracer';
import { ParticleSystem } from './ParticleSystem';
import { randomRange } from './utils';

const STAR_COUNT = 800;
const STAR_FIELD_RADIUS = 50;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rayTracer: RayTracer;
  private particleSystem: ParticleSystem;

  private starField: THREE.Points;
  private starVelocities: Float32Array;

  private isDragging: boolean = false;
  private isEmitting: boolean = false;
  private previousMousePosition: THREE.Vector2 = new THREE.Vector2();
  private currentMousePosition: THREE.Vector2 = new THREE.Vector2();

  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 2;
  private cameraRadius: number = 25;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private canvas: HTMLCanvasElement;

  private emitPlane: THREE.Mesh;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    pixelRatio: number
  ) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.5 };
    this.mouse = new THREE.Vector2();

    this.rayTracer = new RayTracer(scene, pixelRatio);
    this.particleSystem = new ParticleSystem(scene);

    this.emitPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    this.emitPlane.position.z = -5;
    scene.add(this.emitPlane);

    this.starVelocities = new Float32Array(STAR_COUNT * 3);
    this.starField = this.createStarField();
    scene.add(this.starField);

    this.updateCameraPosition();

    this.bindEvents();
  }

  private createStarField(): THREE.Points {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const colors = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = randomRange(-STAR_FIELD_RADIUS, STAR_FIELD_RADIUS);
      positions[i3 + 1] = randomRange(-STAR_FIELD_RADIUS, STAR_FIELD_RADIUS);
      positions[i3 + 2] = randomRange(-STAR_FIELD_RADIUS, STAR_FIELD_RADIUS);

      sizes[i] = randomRange(0.5, 2.5);

      const brightness = randomRange(0.3, 0.8);
      colors[i3] = brightness * randomRange(0.7, 1.0);
      colors[i3 + 1] = brightness * randomRange(0.7, 1.0);
      colors[i3 + 2] = brightness;

      this.starVelocities[i3] = randomRange(-0.02, 0.02);
      this.starVelocities[i3 + 1] = randomRange(-0.02, 0.02);
      this.starVelocities[i3 + 2] = randomRange(-0.02, 0.02);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vSize;
        uniform float uPixelRatio;
        uniform float uTime;
        void main() {
          vColor = aColor;
          vSize = size;
          vec3 pos = position;
          float twinkle = sin(uTime * 1.5 + pos.x * 3.0 + pos.y * 5.0) * 0.3 + 0.7;
          vColor *= twinkle;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          float glow = exp(-d * 8.0);
          gl_FragColor = vec4(vColor + glow * 0.2, alpha * 0.6);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geo, mat);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private getNDC(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private onMouseDown(e: MouseEvent): void {
    this.previousMousePosition.set(e.clientX, e.clientY);

    if (e.button === 2 || e.button === 1) {
      this.isDragging = true;
      return;
    }

    if (e.button === 0) {
      const ndc = this.getNDC(e.clientX, e.clientY);
      this.mouse.copy(ndc);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const hit = this.rayTracer.raycast(this.raycaster);
      if (hit) {
        const burstData = this.rayTracer.getTrailPositionsForBurst(hit.trailIndex, hit.point);
        if (burstData) {
          this.particleSystem.emit(burstData.positions, burstData.color, 14);
          this.rayTracer.removeTrailSegment(hit.trailIndex, hit.point);
        }
      } else {
        this.isEmitting = true;
        this.emitRay(e.clientX, e.clientY);
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const dx = e.clientX - this.previousMousePosition.x;
    const dy = e.clientY - this.previousMousePosition.y;

    if (this.isDragging) {
      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(0.3, Math.min(Math.PI - 0.3, this.cameraPhi - dy * 0.005));
      this.updateCameraPosition();
    }

    if (this.isEmitting) {
      const ndc = this.getNDC(e.clientX, e.clientY);
      this.mouse.copy(ndc);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersects = this.raycaster.intersectObject(this.emitPlane);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const dir = point.clone().sub(this.cameraTarget).normalize();
        const upComponent = new THREE.Vector3(0, 1, 0).multiplyScalar(randomRange(-0.3, 0.3));
        dir.add(upComponent).normalize();
        this.rayTracer.spawnRay(point, dir);
      }
    }

    this.previousMousePosition.set(e.clientX, e.clientY);
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2 || e.button === 1) {
      this.isDragging = false;
    }
    if (e.button === 0) {
      this.isEmitting = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.cameraRadius = Math.max(8, Math.min(60, this.cameraRadius + e.deltaY * 0.03));
    this.updateCameraPosition();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.previousMousePosition.set(touch.clientX, touch.clientY);
      this.isEmitting = true;
      this.emitRay(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      this.isEmitting = false;
      this.isDragging = true;
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      this.previousMousePosition.set(
        (t0.clientX + t1.clientX) / 2,
        (t0.clientY + t1.clientY) / 2
      );
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isEmitting) {
      const touch = e.touches[0];
      const dx = touch.clientX - this.previousMousePosition.x;
      const dy = touch.clientY - this.previousMousePosition.y;
      this.emitRay(touch.clientX, touch.clientY);
      this.previousMousePosition.set(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2 && this.isDragging) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const cx = (t0.clientX + t1.clientX) / 2;
      const cy = (t0.clientY + t1.clientY) / 2;
      const dx = cx - this.previousMousePosition.x;
      const dy = cy - this.previousMousePosition.y;
      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(0.3, Math.min(Math.PI - 0.3, this.cameraPhi - dy * 0.005));
      this.updateCameraPosition();
      this.previousMousePosition.set(cx, cy);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    this.isEmitting = false;
    this.isDragging = false;
  }

  private emitRay(clientX: number, clientY: number): void {
    const ndc = this.getNDC(clientX, clientY);
    this.mouse.copy(ndc);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.emitPlane);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const dir = point.clone().sub(this.camera.position).normalize();
      const lateralOffset = new THREE.Vector3(
        randomRange(-0.3, 0.3),
        randomRange(-0.3, 0.3),
        randomRange(-0.3, 0.3)
      );
      dir.add(lateralOffset).normalize();
      this.rayTracer.spawnRay(point, dir);
    }
  }

  private updateCameraPosition(): void {
    const x = this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraRadius * Math.cos(this.cameraPhi);
    const z = this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);

    this.emitPlane.position.copy(this.cameraTarget);
    this.emitPlane.quaternion.copy(this.camera.quaternion);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(delta: number, elapsed: number): void {
    this.rayTracer.update(delta);
    this.particleSystem.update(delta);
    this.updateStarField(delta, elapsed);
  }

  private updateStarField(delta: number, elapsed: number): void {
    const posAttr = this.starField.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      arr[i3] += this.starVelocities[i3];
      arr[i3 + 1] += this.starVelocities[i3 + 1];
      arr[i3 + 2] += this.starVelocities[i3 + 2];

      for (let j = 0; j < 3; j++) {
        if (Math.abs(arr[i3 + j]) > STAR_FIELD_RADIUS) {
          arr[i3 + j] *= -0.95;
          this.starVelocities[i3 + j] *= -1;
        }
      }
    }
    posAttr.needsUpdate = true;

    (this.starField.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
  }

  setRayThickness(value: number): void {
    this.rayTracer.setRayThickness(value);
  }

  setParticleSpreadSpeed(value: number): void {
    this.particleSystem.setSpreadSpeed(value);
  }

  reset(): void {
    this.rayTracer.clear();
    this.particleSystem.clear();
  }

  dispose(): void {
    this.rayTracer.clear();
    this.particleSystem.clear();
    this.scene.remove(this.starField);
    this.starField.geometry.dispose();
    (this.starField.material as THREE.Material).dispose();
    this.scene.remove(this.emitPlane);
    this.emitPlane.geometry.dispose();
    (this.emitPlane.material as THREE.Material).dispose();
  }
}
