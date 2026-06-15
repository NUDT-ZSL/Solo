import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pulsar } from './core/Pulsar';
import { WaveBeam } from './core/WaveBeam';
import { ParticleCloud } from './core/ParticleCloud';
import { ControlPanel } from './ui/ControlPanel';

class PulsarSpectrum {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  pulsar: Pulsar;
  waveBeam: WaveBeam;
  particleCloud: ParticleCloud;
  clock: THREE.Clock;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  controlPanel: ControlPanel;

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(8, 6, 14);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;
    this.controls.enablePan = false;

    this.createBackground();
    this.pulsar = new Pulsar();
    this.scene.add(this.pulsar.group);

    this.waveBeam = new WaveBeam();
    this.scene.add(this.waveBeam.group);

    this.particleCloud = new ParticleCloud();
    this.scene.add(this.particleCloud.group);

    this.pulsar.onPulse = () => {
      this.waveBeam.emit(this.pulsar.pulseIntensity);
      const beamTip = new THREE.Vector3(0, this.waveBeam.beamLength * 0.5, 0);
      this.particleCloud.addInterference(beamTip, this.pulsar.pulseIntensity);
      const beamTipNeg = new THREE.Vector3(0, -this.waveBeam.beamLength * 0.5, 0);
      this.particleCloud.addInterference(beamTipNeg, this.pulsar.pulseIntensity * 0.6);
    };

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controlPanel = new ControlPanel({
      onPulseFrequencyChange: (v) => {
        this.pulsar.pulseFrequency = v;
      },
      onBeamWidthChange: (v) => {
        this.waveBeam.setBeamWidth(v);
        this.pulsar.beamWidth = v;
      },
      onParticleDensityChange: (v) => {
        this.particleCloud.setDensity(v);
      },
      onReset: () => {
        this.pulsar.pulseFrequency = 1.0;
        this.pulsar.beamWidth = 0.4;
        this.waveBeam.setBeamWidth(0.4);
        this.particleCloud.setDensity(1.0);
        this.camera.position.set(8, 6, 14);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      },
    });
    this.controlPanel.mount();

    this.setupEvents(container);
    this.animate();

    requestAnimationFrame(() => {
      container.classList.add('visible');
    });
  }

  createBackground() {
    const bgGeo = new THREE.SphereGeometry(80, 32, 32);
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
        uniform float uTime;
        varying vec3 vWorldPos;
        void main() {
          float y = normalize(vWorldPos).y;
          vec3 topColor = vec3(0.06, 0.01, 0.12);
          vec3 botColor = vec3(0.01, 0.0, 0.02);
          vec3 col = mix(botColor, topColor, y * 0.5 + 0.5);
          float nebula = sin(vWorldPos.x * 0.3 + uTime * 0.05) * cos(vWorldPos.z * 0.2 + uTime * 0.03) * 0.02;
          col += vec3(nebula * 0.5, nebula * 0.2, nebula);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.name = 'background';
    this.scene.add(bgMesh);

    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 25;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      starSizes[i] = 0.5 + Math.random() * 2.0;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vBrightness;
        void main() {
          vBrightness = 0.5 + 0.5 * sin(uTime * (0.5 + size) + position.x * 0.1);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = size * (200.0 / -mvPos.z);
        }
      `,
      fragmentShader: `
        varying float vBrightness;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vBrightness;
          gl_FragColor = vec4(vec3(0.8, 0.7, 1.0), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stars = new THREE.Points(starGeo, starMat);
    stars.name = 'stars';
    this.scene.add(stars);
  }

  setupEvents(container: HTMLElement) {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.renderer.domElement.addEventListener('click', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.pulsar.coreMesh, false);

      if (intersects.length > 0) {
        this.pulsar.triggerSuperPulse();
        this.waveBeam.emit(2.0);
        this.particleCloud.addInterference(new THREE.Vector3(0, 8, 0), 2.0);
        this.particleCloud.addInterference(new THREE.Vector3(0, -8, 0), 1.5);
      }
    });

    this.renderer.domElement.style.cursor = 'grab';
    this.renderer.domElement.addEventListener('pointerdown', () => {
      this.renderer.domElement.style.cursor = 'grabbing';
    });
    this.renderer.domElement.addEventListener('pointerup', () => {
      this.renderer.domElement.style.cursor = 'grab';
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();

    this.pulsar.update(delta, elapsed);
    this.waveBeam.update(delta);
    this.particleCloud.update(delta, elapsed);

    const bg = this.scene.getObjectByName('background');
    if (bg && (bg as THREE.Mesh).material instanceof THREE.ShaderMaterial) {
      ((bg as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }
    const stars = this.scene.getObjectByName('stars');
    if (stars && (stars as THREE.Points).material instanceof THREE.ShaderMaterial) {
      ((stars as THREE.Points).material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new PulsarSpectrum();
