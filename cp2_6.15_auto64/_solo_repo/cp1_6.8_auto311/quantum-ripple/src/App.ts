import * as THREE from 'three';
import { QuantumField } from './QuantumField';
import { ControlPanel } from './ControlPanel';

const SPHERE_RADIUS = 1.5;
const SCENE_ROTATION_SPEED = 0.05;

export class App {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  quantumField: QuantumField;
  controlPanel: ControlPanel;

  private sphere: THREE.Mesh;
  private sphereGlow: THREE.Mesh;
  private pulseRing: THREE.Mesh;
  private pulseRingScale: number;
  private pulseRingOpacity: number;
  private isPulsing: boolean;

  private sceneGroup: THREE.Group;
  private rotationAngle: number;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean;
  private previousMouse: THREE.Vector2;
  private cameraDistance: number;
  private cameraTheta: number;
  private cameraPhi: number;

  private clock: THREE.Clock;
  private animationId: number;
  private clickTimeout: number | null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.clock = new THREE.Clock();
    this.animationId = 0;
    this.clickTimeout = null;

    this.sceneGroup = new THREE.Group();
    this.rotationAngle = 0;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.previousMouse = new THREE.Vector2();
    this.cameraDistance = 8;
    this.cameraTheta = Math.PI / 4;
    this.cameraPhi = Math.PI / 2;

    this.pulseRingScale = 0;
    this.pulseRingOpacity = 0;
    this.isPulsing = false;

    this.sphere = this.createSphere();
    this.sphereGlow = this.createSphereGlow();
    this.pulseRing = this.createPulseRing();

    this.quantumField = new QuantumField(
      new THREE.Vector3(0, 0, 0),
      SPHERE_RADIUS,
    );

    this.controlPanel = new ControlPanel({
      spawnRate: 8,
      pulseIntensity: 1,
      showTrails: false,
      onSpawnRateChange: (val) => this.quantumField.setSpawnRate(val),
      onPulseIntensityChange: (val) => this.quantumField.setPulseIntensity(val),
      onShowTrailsChange: (val) => this.quantumField.setShowTrails(val),
    });

    this.init();
  }

  private init(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    document.body.appendChild(this.renderer.domElement);

    this.scene.add(this.sceneGroup);
    this.sceneGroup.add(this.sphere);
    this.sceneGroup.add(this.sphereGlow);
    this.sceneGroup.add(this.pulseRing);
    this.sceneGroup.add(this.quantumField.points);
    this.sceneGroup.add(this.quantumField.trailLines);

    this.updateCameraPosition();

    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.renderer.domElement.addEventListener('click', this.onClick);
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick);
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private createSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float smoothNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = noise(i);
          float b = noise(i + vec2(1.0, 0.0));
          float c = noise(i + vec2(0.0, 1.0));
          float d = noise(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float val = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 4; i++) {
            val += amp * smoothNoise(p);
            p *= 2.0;
            amp *= 0.5;
          }
          return val;
        }

        void main() {
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

          vec2 flowUv = vUv * 3.0 + vec2(uTime * 0.1, uTime * 0.07);
          float flow = fbm(flowUv);

          vec2 flowUv2 = vUv * 5.0 + vec2(-uTime * 0.08, uTime * 0.12);
          float flow2 = fbm(flowUv2);

          vec3 baseColor = vec3(0.15, 0.05, 0.3);
          vec3 flowColor1 = vec3(0.3, 0.1, 0.6);
          vec3 flowColor2 = vec3(0.1, 0.2, 0.5);
          vec3 pulseColor = vec3(0.6, 0.3, 1.0);

          vec3 color = baseColor;
          color = mix(color, flowColor1, flow * 0.6);
          color = mix(color, flowColor2, flow2 * 0.4);
          color = mix(color, pulseColor, uPulse * 0.8);

          color += fresnel * vec3(0.4, 0.2, 0.8) * 0.8;
          color += fresnel * pulseColor * uPulse * 1.5;

          float alpha = 0.25 + fresnel * 0.5 + uPulse * 0.3;
          alpha = clamp(alpha, 0.0, 0.85);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    return new THREE.Mesh(geometry, material);
  }

  private createSphereGlow(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS * 1.4, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPulse: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPulse;
        varying vec3 vNormal;
        void main() {
          vec3 viewDir = vec3(0.0, 0.0, 1.0);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0);
          vec3 color = vec3(0.3, 0.1, 0.7) + vec3(0.3, 0.2, 0.5) * uPulse;
          float alpha = fresnel * (0.15 + uPulse * 0.4);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geometry, material);
  }

  private createPulseRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.8, 1.2, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uScale;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float ring = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
          vec3 color = mix(vec3(0.2, 0.3, 0.9), vec3(0.7, 0.2, 0.9), vUv.x);
          color += vec3(0.3, 0.1, 0.5) * ring;
          float alpha = ring * uOpacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    return mesh;
  }

  private updateCameraPosition(): void {
    this.camera.position.x =
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.y =
      this.cameraDistance * Math.cos(this.cameraPhi);
    this.camera.position.z =
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.lookAt(0, 0, 0);
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.rotationAngle += SCENE_ROTATION_SPEED * delta;
    this.sceneGroup.rotation.y = this.rotationAngle;

    this.quantumField.update(delta);

    const sphereMat = this.sphere.material as THREE.ShaderMaterial;
    sphereMat.uniforms.uTime.value += delta;
    sphereMat.uniforms.uPulse.value = THREE.MathUtils.lerp(
      sphereMat.uniforms.uPulse.value,
      0,
      delta * 2,
    );

    const glowMat = this.sphereGlow.material as THREE.ShaderMaterial;
    glowMat.uniforms.uPulse.value = THREE.MathUtils.lerp(
      glowMat.uniforms.uPulse.value,
      0,
      delta * 2,
    );

    if (this.isPulsing) {
      this.pulseRingScale += delta * 4;
      this.pulseRingOpacity = Math.max(0, 1 - this.pulseRingScale / 5);

      const ringMat = this.pulseRing.material as THREE.ShaderMaterial;
      ringMat.uniforms.uScale.value = this.pulseRingScale;
      ringMat.uniforms.uOpacity.value = this.pulseRingOpacity;

      this.pulseRing.scale.set(
        this.pulseRingScale,
        this.pulseRingScale,
        this.pulseRingScale,
      );
      this.pulseRing.visible = this.pulseRingOpacity > 0.01;

      if (this.pulseRingOpacity <= 0.01) {
        this.isPulsing = false;
        this.pulseRing.visible = false;
        this.pulseRingScale = 0;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private triggerPulse(): void {
    this.quantumField.triggerPulse();

    const sphereMat = this.sphere.material as THREE.ShaderMaterial;
    sphereMat.uniforms.uPulse.value = 1;

    const glowMat = this.sphereGlow.material as THREE.ShaderMaterial;
    glowMat.uniforms.uPulse.value = 1;

    this.isPulsing = true;
    this.pulseRingScale = 1;
    this.pulseRingOpacity = 1;
    this.pulseRing.visible = true;
    this.pulseRing.scale.set(1, 1, 1);
  }

  private resetScene(): void {
    this.quantumField.reset();
    this.rotationAngle = 0;
    this.sceneGroup.rotation.y = 0;
    this.cameraDistance = 8;
    this.cameraTheta = Math.PI / 4;
    this.cameraPhi = Math.PI / 2;
    this.updateCameraPosition();
    this.isPulsing = false;
    this.pulseRing.visible = false;
    this.pulseRingScale = 0;
    this.pulseRingOpacity = 0;
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onMouseDown = (event: MouseEvent): void => {
    this.isDragging = true;
    this.previousMouse.set(event.clientX, event.clientY);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.cameraTheta -= deltaX * 0.005;
    this.cameraPhi -= deltaY * 0.005;
    this.cameraPhi = THREE.MathUtils.clamp(this.cameraPhi, 0.1, Math.PI - 0.1);

    this.updateCameraPosition();
    this.previousMouse.set(event.clientX, event.clientY);
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.cameraDistance += event.deltaY * 0.005;
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance, 3, 20);
    this.updateCameraPosition();
  };

  private onClick = (event: MouseEvent): void => {
    if (this.isDragging) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.sphere);

    if (intersects.length > 0) {
      this.triggerPulse();
    }
  };

  private onDoubleClick = (): void => {
    this.resetScene();
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.controlPanel.dispose();
  }
}
