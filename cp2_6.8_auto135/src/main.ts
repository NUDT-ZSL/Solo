import * as THREE from 'three';
import gsap from 'gsap';
import { LightsaberForge, LightsaberParams } from './forge';
import { WieldSystem } from './wield';

type AppState = 'forge' | 'wield';

const NEON_COLORS = [
  '#FF3366',
  '#FF6633',
  '#FFCC00',
  '#00FF88',
  '#00CCFF',
  '#AA66FF',
];

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private saber!: LightsaberForge;
  private wieldSystem!: WieldSystem;

  private ambientLight!: THREE.AmbientLight;
  private keyLight!: THREE.PointLight;
  private floor!: THREE.Mesh;

  private state: AppState = 'forge';

  private params: LightsaberParams = {
    bladeColor: '#00CCFF',
    bladeLength: 1.0,
    glowIntensity: 1.0,
    hiltRoughness: 0.4,
  };

  private selectedColorIndex: number = 4;

  private forgeUI!: HTMLElement;
  private backBtn!: HTMLElement;
  private colorPicker!: HTMLElement;
  private colorWheel!: HTMLInputElement;
  private lengthSlider!: HTMLInputElement;
  private lengthValue!: HTMLElement;
  private glowSlider!: HTMLInputElement;
  private glowValue!: HTMLElement;
  private roughnessSlider!: HTMLInputElement;
  private roughnessValue!: HTMLElement;
  private forgeBtn!: HTMLElement;

  private audioContext: AudioContext | null = null;
  private humOscillator: OscillatorNode | null = null;
  private humGain: GainNode | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.5, 5);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupFloor();
    this.setupSaber();
    this.setupUI();
    this.setupAudio();

    window.addEventListener('resize', this.onResize);

    this.animate();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.PointLight(0xffffff, 1.0, 30, 2);
    this.keyLight.position.set(-5, 8, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.keyLight);
  }

  private setupFloor(): void {
    const geometry = new THREE.PlaneGeometry(50, 50);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2D3748,
      metalness: 0.6,
      roughness: 0.8,
    });
    this.floor = new THREE.Mesh(geometry, material);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -1.2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    const grid = new THREE.GridHelper(50, 50, 0x1a1a2e, 0x151520);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -1.19;
    this.scene.add(grid);
  }

  private setupSaber(): void {
    this.saber = new LightsaberForge(this.params);
    this.saber.group.position.set(0, 0, 0);
    this.saber.group.rotation.set(-0.3, 0.5, 0);
    this.scene.add(this.saber.group);

    this.wieldSystem = new WieldSystem(
      this.scene,
      this.camera,
      this.saber,
      this.renderer.domElement
    );
    this.wieldSystem.setGridLinesVisible(false);
    this.wieldSystem.onMouseSpeedChange = (speed) => {
      this.updateHumSound(speed);
    };
  }

  private setupUI(): void {
    this.forgeUI = document.getElementById('forge-ui')!;
    this.backBtn = document.getElementById('back-btn')!;
    this.colorPicker = document.getElementById('color-picker')!;
    this.colorWheel = document.getElementById('color-wheel') as HTMLInputElement;
    this.lengthSlider = document.getElementById('length-slider') as HTMLInputElement;
    this.lengthValue = document.getElementById('length-value')!;
    this.glowSlider = document.getElementById('glow-slider') as HTMLInputElement;
    this.glowValue = document.getElementById('glow-value')!;
    this.roughnessSlider = document.getElementById('roughness-slider') as HTMLInputElement;
    this.roughnessValue = document.getElementById('roughness-value')!;
    this.forgeBtn = document.getElementById('forge-btn')!;

    NEON_COLORS.forEach((color, index) => {
      const btn = document.createElement('div');
      btn.className = 'color-btn';
      btn.style.backgroundColor = color;
      btn.style.color = color;
      btn.dataset.index = String(index);
      if (index === this.selectedColorIndex) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        this.selectColor(index, color);
      });
      this.colorPicker.appendChild(btn);
    });

    this.updateUIColor(this.params.bladeColor as string);

    this.colorWheel.addEventListener('input', (e) => {
      const hue = parseInt((e.target as HTMLInputElement).value);
      const color = new THREE.Color().setHSL(hue / 360, 1, 0.6);
      const hex = `#${color.getHexString()}`;
      this.setBladeColor(hex);
      this.deselectPresetColors();
    });

    this.lengthSlider.addEventListener('input', (e) => {
      this.params.bladeLength = parseFloat((e.target as HTMLInputElement).value);
      this.lengthValue.textContent = `${this.params.bladeLength.toFixed(2)}x`;
      this.saber.update(this.params);
    });

    this.glowSlider.addEventListener('input', (e) => {
      this.params.glowIntensity = parseFloat((e.target as HTMLInputElement).value);
      this.glowValue.textContent = `${this.params.glowIntensity.toFixed(2)}x`;
      this.saber.update(this.params);
    });

    this.roughnessSlider.addEventListener('input', (e) => {
      this.params.hiltRoughness = parseFloat((e.target as HTMLInputElement).value);
      this.roughnessValue.textContent = this.params.hiltRoughness.toFixed(2);
      this.saber.update(this.params);
    });

    this.forgeBtn.addEventListener('click', () => {
      this.enterWieldMode();
    });

    this.backBtn.addEventListener('click', () => {
      this.enterForgeMode();
    });
  }

  private setupAudio(): void {
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch {
      this.audioContext = null;
    }
  }

  private selectColor(index: number, color: string): void {
    this.selectedColorIndex = index;
    this.deselectPresetColors();
    const btns = this.colorPicker.querySelectorAll('.color-btn');
    btns[index].classList.add('selected');
    this.setBladeColor(color);

    const hsl = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 });
    this.colorWheel.value = String(Math.round(hsl.h * 360));
  }

  private deselectPresetColors(): void {
    this.colorPicker
      .querySelectorAll('.color-btn')
      .forEach((btn) => btn.classList.remove('selected'));
  }

  private setBladeColor(color: string): void {
    this.params.bladeColor = color;
    this.saber.update(this.params);
    this.updateUIColor(color);
    this.wieldSystem.updateGridColor();
  }

  private updateUIColor(color: string): void {
    document.documentElement.style.setProperty('--blade-color', color);
    document.documentElement.style.setProperty('--thumb-color', color);
    this.colorWheel.style.setProperty('--thumb-color', color);
  }

  private enterWieldMode(): void {
    if (this.state === 'wield') return;
    this.state = 'wield';

    this.playIgnitionSound();

    this.forgeUI.classList.add('hidden');
    this.backBtn.classList.add('visible');

    gsap.to(this.scene.background as THREE.Color, {
      duration: 0.5,
      r: 0,
      g: 0,
      b: 0,
    });

    gsap.to(this.ambientLight, { intensity: 0.05, duration: 0.5 });
    gsap.to(this.keyLight, { intensity: 0.0, duration: 0.5 });

    const floorMat = this.floor.material as THREE.MeshStandardMaterial;
    gsap.to(floorMat.color, {
      r: 0.02,
      g: 0.02,
      b: 0.05,
      duration: 0.5,
    });
    gsap.to(floorMat, { metalness: 0.9, roughness: 0.2, duration: 0.5 });

    gsap.to(this.camera.position, {
      duration: 0.6,
      x: 0,
      y: 0.5,
      z: 3.5,
      ease: 'power2.out',
    });

    this.wieldSystem.setGridLinesVisible(true);
    this.startHumSound();
  }

  private enterForgeMode(): void {
    if (this.state === 'forge') return;
    this.state = 'forge';

    this.playRetractionSound();
    this.stopHumSound();

    this.wieldSystem.reset();
    this.wieldSystem.setGridLinesVisible(false);

    this.forgeUI.classList.remove('hidden');
    this.backBtn.classList.remove('visible');
    setTimeout(() => {
      this.backBtn.classList.remove('visible');
    }, 100);

    this.scene.background = new THREE.Color(0x0a0a12);

    gsap.to(this.ambientLight, { intensity: 0.3, duration: 0.5 });
    gsap.to(this.keyLight, { intensity: 1.0, duration: 0.5 });

    const floorMat = this.floor.material as THREE.MeshStandardMaterial;
    gsap.to(floorMat.color, {
      r: 0x2d / 255,
      g: 0x37 / 255,
      b: 0x48 / 255,
      duration: 0.5,
    });
    gsap.to(floorMat, { metalness: 0.6, roughness: 0.8, duration: 0.5 });

    gsap.to(this.camera.position, {
      duration: 0.6,
      x: 0,
      y: 1.5,
      z: 5,
      ease: 'power2.out',
    });

    this.saber.group.rotation.set(-0.3, 0.5, 0);
  }

  private playIgnitionSound(): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      800,
      this.audioContext.currentTime + 0.3
    );

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(
      0.15,
      this.audioContext.currentTime + 0.05
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + 0.3
    );

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }

  private playRetractionSound(): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      200,
      this.audioContext.currentTime + 0.3
    );

    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + 0.3
    );

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }

  private startHumSound(): void {
    if (!this.audioContext || this.humOscillator) return;

    this.humOscillator = this.audioContext.createOscillator();
    this.humGain = this.audioContext.createGain();

    this.humOscillator.type = 'sawtooth';
    this.humOscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);

    this.humGain!.gain.setValueAtTime(0, this.audioContext.currentTime);

    const noise = this.audioContext.createBufferSource();
    const bufferSize = this.audioContext.sampleRate * 2;
    const noiseBuffer = this.audioContext.createBuffer(
      1,
      bufferSize,
      this.audioContext.sampleRate
    );
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.value = 0.05;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    this.humOscillator.connect(filter);
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    filter.connect(this.humGain!);
    this.humGain!.connect(this.audioContext.destination);

    this.humOscillator.start();
    noise.start();
  }

  private updateHumSound(speed: number): void {
    if (!this.audioContext || !this.humOscillator || !this.humGain) return;

    const intensity = Math.min(1, speed / 2000);
    const freq = 400 + intensity * 200;
    const gain = 0.02 + intensity * 0.08;

    this.humOscillator.frequency.setTargetAtTime(
      freq,
      this.audioContext.currentTime,
      0.05
    );
    this.humGain.gain.setTargetAtTime(
      gain,
      this.audioContext.currentTime,
      speed === 0 ? 0.2 : 0.05
    );
  }

  private stopHumSound(): void {
    if (!this.audioContext || !this.humOscillator || !this.humGain) return;

    this.humGain.gain.setTargetAtTime(
      0,
      this.audioContext.currentTime,
      0.1
    );

    setTimeout(() => {
      if (this.humOscillator) {
        this.humOscillator.stop();
        this.humOscillator.disconnect();
        this.humOscillator = null;
      }
      if (this.humGain) {
        this.humGain.disconnect();
        this.humGain = null;
      }
    }, 200);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    if (this.state === 'forge') {
      const time = this.clock.elapsedTime;
      this.saber.group.rotation.y = 0.5 + Math.sin(time * 0.5) * 0.1;
      this.saber.group.position.y = Math.sin(time * 1.2) * 0.05;
    } else {
      this.wieldSystem.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.wieldSystem.dispose();
    this.saber.dispose();
    this.renderer.dispose();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
