import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TideSystem } from './TideSystem';
import { Bioluminescence } from './Bioluminescence';

export interface SceneParams {
  tideSpeed: number;
  glowIntensity: number;
  particleDensity: number;
}

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private tideSystem: TideSystem;
  private bioluminescence: Bioluminescence;
  private canyonMesh!: THREE.Mesh;
  private canyonPositions!: Float32Array;
  private canyonOriginalY!: Float32Array;
  private clock = new THREE.Clock();
  private params: SceneParams;
  private animId = 0;
  private onBurstInfo: ((info: { phase: number; density: number; intensity: number }) => void) | null = null;

  constructor(container: HTMLElement, params: SceneParams) {
    this.params = params;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x021a2b, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      500,
    );
    this.camera.position.set(0, 30, 60);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 150;
    this.controls.maxPolarAngle = Math.PI * 0.85;

    this.setupLights();
    this.createCanyon();
    this.createBackground();

    this.tideSystem = new TideSystem();
    this.bioluminescence = new Bioluminescence(
      this.scene,
      this.tideSystem,
      this.renderer.domElement,
      this.camera,
      params,
    );

    this.bioluminescence.onBurst = (info) => {
      this.onBurstInfo?.(info);
    };

    this.setupClickHandler();

    window.addEventListener('resize', this.onResize);
  }

  setBurstInfoCallback(cb: (info: { phase: number; density: number; intensity: number }) => void) {
    this.onBurstInfo = cb;
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x0a1628, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x1a4a6e, 0.3);
    dirLight.position.set(0, 50, 20);
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x00e5ff, 1.5, 80);
    pointLight1.position.set(-20, 15, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x7b2ff7, 1.0, 80);
    pointLight2.position.set(20, 20, 10);
    this.scene.add(pointLight2);
  }

  private createBackground() {
    const bgGeo = new THREE.SphereGeometry(200, 32, 32);
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
          float t = (vWorldPos.y + 200.0) / 400.0;
          vec3 deepBlue = vec3(0.008, 0.045, 0.11);
          vec3 darkGreen = vec3(0.0, 0.06, 0.05);
          vec3 col = mix(darkGreen, deepBlue, t);
          float shimmer = sin(vWorldPos.x * 0.05 + uTime * 0.3) * 0.008;
          col += shimmer;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.name = 'bgSphere';
    this.scene.add(bgMesh);
  }

  private createCanyon() {
    const width = 120;
    const depth = 120;
    const segW = 80;
    const segD = 80;

    const geo = new THREE.PlaneGeometry(width, depth, segW, segD);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    this.canyonPositions = new Float32Array(pos.array.length);
    this.canyonPositions.set(pos.array);
    this.canyonOriginalY = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.canyonHeight(x, z, 0);
      pos.setY(i, y);
      this.canyonOriginalY[i] = y;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTidePhase: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vY;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vY;
        uniform float uTime;
        uniform float uTidePhase;
        void main() {
          vec3 baseColor = mix(
            vec3(0.012, 0.04, 0.06),
            vec3(0.02, 0.07, 0.065),
            smoothstep(-8.0, 2.0, vY)
          );
          vec3 lightDir = normalize(vec3(0.3, 1.0, 0.2));
          float diff = max(dot(vNormal, lightDir), 0.0) * 0.4;
          float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
          vec3 rimColor = vec3(0.0, 0.3, 0.4) * rim * 0.3;
          float wave = sin(vWorldPos.x * 0.15 + uTime * 0.5) * sin(vWorldPos.z * 0.15 + uTime * 0.3) * 0.015;
          vec3 finalColor = baseColor + diff + rimColor + wave;
          float alpha = 0.85;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });

    this.canyonMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.canyonMesh);
  }

  private canyonHeight(x: number, z: number, time: number): number {
    let y = -3.0;
    y += Math.sin(x * 0.08 + 1.0) * Math.cos(z * 0.06) * 4.0;
    y += Math.sin(x * 0.15 + z * 0.12) * 2.5;
    y += Math.cos(x * 0.04 - z * 0.08 + 2.0) * 3.0;

    const dist = Math.sqrt(x * x + z * z);
    y += Math.sin(dist * 0.1) * 2.0;

    const wave = Math.sin(x * 0.1 + time * 0.5) * Math.cos(z * 0.1 + time * 0.3) * 0.15;
    y += wave;

    if (dist < 15) {
      y -= (15 - dist) * 0.3;
    }

    return y;
  }

  private animateCanyon(time: number) {
    const pos = this.canyonMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = this.canyonPositions[i * 3];
      const z = this.canyonPositions[i * 3 + 2];
      const y = this.canyonHeight(x, z, time);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.canyonMesh.geometry.computeVertexNormals();

    const mat = this.canyonMesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = time;
    mat.uniforms.uTidePhase.value = this.tideSystem.getPhase();

    const bgObj = this.scene.getObjectByName('bgSphere');
    if (bgObj) {
      (bgObj as THREE.Mesh).material = bgObj.material;
      ((bgObj as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
  }

  private setupClickHandler() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.bioluminescence.handleClick(mouse);
    });
  }

  updateParams(params: SceneParams) {
    this.params = params;
    this.bioluminescence.updateParams(params);
  }

  private onResize = () => {
    const w = this.renderer.domElement.parentElement?.clientWidth ?? window.innerWidth;
    const h = this.renderer.domElement.parentElement?.clientHeight ?? window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  start() {
    const animate = () => {
      this.animId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.controls.update();
      this.tideSystem.update(delta * this.params.tideSpeed);
      this.animateCanyon(elapsed);
      this.bioluminescence.update(delta, elapsed);

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
  }

  dispose() {
    this.stop();
    this.bioluminescence.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
