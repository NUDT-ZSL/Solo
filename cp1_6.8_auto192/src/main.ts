import * as THREE from 'three';
import { FlowSimulator } from './FlowSimulator';
import { InkParticleSystem } from './InkParticleSystem';
import { UI } from './UI';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private flowSimulator: FlowSimulator;
  private inkSystem: InkParticleSystem;
  private ui: UI;
  private clock: THREE.Clock;
  private bgMesh: THREE.Mesh;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    document.body.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    this.camera.position.z = 10;

    this.bgMesh = this.createBackground();
    this.scene.add(this.bgMesh);

    this.flowSimulator = new FlowSimulator();
    this.inkSystem = new InkParticleSystem(this.scene, this.flowSimulator);
    this.ui = new UI(this.inkSystem, this.camera, this.renderer.domElement);
    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private createBackground(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec2 uv = vUv;

          vec3 deepBlue = vec3(0.039, 0.055, 0.153);
          vec3 midBlue = vec3(0.055, 0.067, 0.196);
          vec3 darkTeal = vec3(0.02, 0.08, 0.12);

          float n1 = noise(uv * 3.0 + uTime * 0.02);
          float n2 = noise(uv * 6.0 - uTime * 0.015);

          vec3 col = mix(deepBlue, midBlue, uv.y * 0.6 + n1 * 0.3);
          col = mix(col, darkTeal, n2 * 0.25);

          float vignette = 1.0 - length((uv - 0.5) * 1.3);
          vignette = smoothstep(0.0, 0.8, vignette);
          col *= 0.7 + vignette * 0.3;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -1;
    return mesh;
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const frustumSize = 30;

    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const dt = this.clock.getDelta();

    this.flowSimulator.update(dt);
    this.inkSystem.update(dt);

    const mat = this.bgMesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = this.clock.elapsedTime;

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
