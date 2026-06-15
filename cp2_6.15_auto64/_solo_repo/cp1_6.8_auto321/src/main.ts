import * as THREE from 'three';
import { Crystal } from './Crystal';
import { TimeSystem } from './TimeSystem';
import { InteractionManager } from './InteractionManager';
import { ControlPanel } from './ControlPanel';

class TimeCrystalApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private timeSystem: TimeSystem;
  private crystal: Crystal;
  private interactionManager: InteractionManager;
  private controlPanel: ControlPanel;
  private particles: THREE.Points;
  private clock: THREE.Clock;
  private backgroundMesh: THREE.Mesh;

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1.5, 0);

    this.timeSystem = new TimeSystem();

    this.crystal = new Crystal(this.timeSystem);
    this.scene.add(this.crystal.group);

    this.interactionManager = new InteractionManager(
      this.camera,
      this.crystal,
      this.renderer.domElement
    );

    this.controlPanel = new ControlPanel(this.timeSystem, this.interactionManager);

    this.particles = this._createParticles();
    this.scene.add(this.particles);

    this.backgroundMesh = this._createBackground();
    this.scene.add(this.backgroundMesh);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2, 20);
    pointLight.position.set(3, 5, 3);
    this.scene.add(pointLight);

    const rimLight = new THREE.PointLight(0x8888ff, 0.5, 15);
    rimLight.position.set(-3, 2, -3);
    this.scene.add(rimLight);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this._onResize.bind(this));

    this._animate();
  }

  private _createParticles(): THREE.Points {
    const count = 300;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 4.0;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6 + 1.5;
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 1.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          float t = uTime * 0.3 + aPhase;
          pos.x += sin(t) * 0.15;
          pos.y += cos(t * 0.7) * 0.1;
          pos.z += sin(t * 0.5) * 0.15;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;

          vAlpha = 0.3 + 0.7 * (0.5 + 0.5 * sin(t * 1.5));
        }
      `,
      fragmentShader: `
        uniform vec3 uParticleColor;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha * 0.6;
          float core = smoothstep(0.2, 0.0, dist) * 0.5;
          vec3 color = uParticleColor + vec3(core);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uParticleColor: { value: new THREE.Color(0.5, 0.6, 1.0) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geom, mat);
  }

  private _createBackground(): THREE.Mesh {
    const geom = new THREE.PlaneGeometry(40, 40);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUvCoord;
        void main() {
          vUvCoord = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uBgColorTop;
        uniform vec3 uBgColorBottom;
        uniform float uTime;
        varying vec2 vUvCoord;

        void main() {
          vec2 uv = vUvCoord;
          float gradient = uv.y;

          vec3 color = mix(uBgColorBottom, uBgColorTop, gradient);

          float nebula = sin(uv.x * 4.0 + uTime * 0.05) * cos(uv.y * 3.0 - uTime * 0.03) * 0.03;
          nebula += sin(uv.x * 7.0 - uTime * 0.08) * cos(uv.y * 5.0 + uTime * 0.04) * 0.02;
          color += vec3(nebula * 0.5, nebula * 0.3, nebula);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uBgColorTop: { value: new THREE.Color(0x1a0030) },
        uBgColorBottom: { value: new THREE.Color(0x050008) },
        uTime: { value: 0 },
      },
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.z = -15;
    mesh.renderOrder = -1;
    return mesh;
  }

  private _animate(): void {
    requestAnimationFrame(this._animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.timeSystem.update(delta);
    this.crystal.update(delta, elapsed);
    this.crystal.updateGlow(elapsed);
    this.interactionManager.update(delta);
    this.controlPanel.update();

    const particleMat = this.particles.material as THREE.ShaderMaterial;
    particleMat.uniforms.uTime.value = elapsed;
    const emissive = this.timeSystem.getEmissiveColor();
    particleMat.uniforms.uParticleColor.value.copy(emissive).multiplyScalar(0.5);

    const bgMat = this.backgroundMesh.material as THREE.ShaderMaterial;
    bgMat.uniforms.uTime.value = elapsed;
    const bgColor = this.timeSystem.getBackgroundColor();
    bgMat.uniforms.uBgColorTop.value.copy(bgColor).offsetHSL(0, 0, 0.08);
    bgMat.uniforms.uBgColorBottom.value.copy(bgColor).multiplyScalar(0.3);

    this.particles.rotation.y = elapsed * 0.02;

    this.renderer.render(this.scene, this.camera);
  }

  private _onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

new TimeCrystalApp();
