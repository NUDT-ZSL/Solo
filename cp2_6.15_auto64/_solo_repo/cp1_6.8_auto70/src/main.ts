import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DesertScene } from './DesertScene';
import { TotemInfo } from './TotemPillar';

function createUI(
  desertScene: DesertScene,
  onShowInfo: (info: TotemInfo, worldPos: THREE.Vector3) => void
): void {
  const style = document.createElement('style');
  style.textContent = `
    .glass-panel {
      position: fixed;
      background: rgba(30, 18, 8, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(212, 168, 85, 0.25);
      border-radius: 12px;
      color: #e8d5b0;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      z-index: 100;
    }
    .control-panel {
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 220px;
      padding: 20px;
    }
    .control-panel h3 {
      margin: 0 0 16px 0;
      font-size: 14px;
      text-align: center;
      color: #d4a855;
      letter-spacing: 2px;
      border-bottom: 1px solid rgba(212, 168, 85, 0.2);
      padding-bottom: 10px;
    }
    .slider-group {
      margin-bottom: 14px;
    }
    .slider-group label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
      color: #c4a35a;
    }
    .slider-group input[type="range"] {
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(212, 168, 85, 0.2);
      border-radius: 2px;
      outline: none;
    }
    .slider-group input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #d4a855;
      cursor: pointer;
      box-shadow: 0 0 8px rgba(212, 168, 85, 0.5);
    }
    .slider-group input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #d4a855;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 8px rgba(212, 168, 85, 0.5);
    }
    .reset-btn {
      width: 100%;
      padding: 8px;
      margin-top: 8px;
      background: rgba(212, 168, 85, 0.15);
      border: 1px solid rgba(212, 168, 85, 0.3);
      border-radius: 6px;
      color: #d4a855;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 1px;
    }
    .reset-btn:hover {
      background: rgba(212, 168, 85, 0.3);
      box-shadow: 0 0 12px rgba(212, 168, 85, 0.3);
    }
    .info-card {
      position: fixed;
      padding: 16px 20px;
      pointer-events: none;
      transition: opacity 0.5s ease;
    }
    .info-card h4 {
      margin: 0 0 10px 0;
      font-size: 15px;
      color: #d4a855;
      letter-spacing: 1px;
    }
    .info-card p {
      margin: 4px 0;
      font-size: 12px;
      color: #c4a35a;
      line-height: 1.6;
    }
    .info-card .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-card .info-icon {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #d4a855;
      box-shadow: 0 0 6px #d4a855;
    }
    .title-overlay {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 28px;
      font-size: 18px;
      letter-spacing: 6px;
      color: #d4a855;
      background: rgba(30, 18, 8, 0.5);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(212, 168, 85, 0.2);
      border-radius: 8px;
      z-index: 100;
    }
    @media (max-width: 768px) {
      .control-panel {
        top: auto;
        bottom: 10px;
        right: 10px;
        left: 10px;
        width: auto;
        transform: none;
      }
      .title-overlay {
        font-size: 14px;
        letter-spacing: 3px;
        padding: 8px 16px;
      }
    }
  `;
  document.head.appendChild(style);

  const title = document.createElement('div');
  title.className = 'glass-panel title-overlay';
  title.textContent = '风 沙 图 腾';
  document.body.appendChild(title);

  const panel = document.createElement('div');
  panel.className = 'glass-panel control-panel';
  panel.innerHTML = `
    <h3>风沙控制</h3>
    <div class="slider-group">
      <label><span>风速</span><span id="wind-val">1.0</span></label>
      <input type="range" id="wind-speed" min="0" max="3" step="0.1" value="1.0" />
    </div>
    <div class="slider-group">
      <label><span>沙粒密度</span><span id="density-val">1.0</span></label>
      <input type="range" id="sand-density" min="0.1" max="2" step="0.1" value="1.0" />
    </div>
    <div class="slider-group">
      <label><span>侵蚀强度</span><span id="erosion-val">0.5</span></label>
      <input type="range" id="erosion-strength" min="0" max="1" step="0.05" value="0.5" />
    </div>
    <button class="reset-btn" id="reset-btn">重置沙丘</button>
  `;
  document.body.appendChild(panel);

  const windSlider = document.getElementById('wind-speed') as HTMLInputElement;
  const densitySlider = document.getElementById('sand-density') as HTMLInputElement;
  const erosionSlider = document.getElementById('erosion-strength') as HTMLInputElement;
  const windVal = document.getElementById('wind-val')!;
  const densityVal = document.getElementById('density-val')!;
  const erosionVal = document.getElementById('erosion-val')!;
  const resetBtn = document.getElementById('reset-btn')!;

  function updateParams(): void {
    desertScene.updateParams({
      windSpeed: parseFloat(windSlider.value),
      sandDensity: parseFloat(densitySlider.value),
      erosionStrength: parseFloat(erosionSlider.value),
    });
    windVal.textContent = windSlider.value;
    densityVal.textContent = densitySlider.value;
    erosionVal.textContent = erosionSlider.value;
  }

  windSlider.addEventListener('input', updateParams);
  densitySlider.addEventListener('input', updateParams);
  erosionSlider.addEventListener('input', updateParams);
  resetBtn.addEventListener('click', () => desertScene.reset());

  let infoCard: HTMLDivElement | null = null;
  let infoCardTimer: number = 0;

  desertScene.setOnTotemClick((info: TotemInfo, _worldPos: THREE.Vector3) => {
    onShowInfo(info, _worldPos);
    if (infoCard) {
      clearTimeout(infoCardTimer);
      infoCard.remove();
    }
    infoCard = document.createElement('div');
    infoCard.className = 'glass-panel info-card';
    infoCard.style.left = '50%';
    infoCard.style.top = '50%';
    infoCard.style.transform = 'translate(-50%, -50%)';
    infoCard.style.opacity = '0';
    infoCard.innerHTML = `
      <h4>风沙共鸣</h4>
      <div class="info-row"><div class="info-icon"></div><p>方位：${info.direction}</p></div>
      <div class="info-row"><div class="info-icon"></div><p>风速：${info.windSpeed}</p></div>
      <div class="info-row"><div class="info-icon"></div><p>年代：${info.era}</p></div>
    `;
    document.body.appendChild(infoCard);
    requestAnimationFrame(() => {
      if (infoCard) infoCard.style.opacity = '1';
    });
    infoCardTimer = window.setTimeout(() => {
      if (infoCard) {
        infoCard.style.opacity = '0';
        setTimeout(() => {
          infoCard?.remove();
          infoCard = null;
        }, 500);
      }
    }, 4000);
  });
}

class App {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private desertScene: DesertScene;

  constructor() {
    const container = document.body;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(15, 12, 20);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 0, 0);

    this.desertScene = new DesertScene({
      windSpeed: 1.0,
      sandDensity: 1.0,
      erosionStrength: 0.5,
    });

    createUI(this.desertScene, (_info, _pos) => {});

    this.setupClickHandler();
    this.setupResize();
    this.animate();
  }

  private setupClickHandler(): void {
    const mouse = new THREE.Vector2();
    const onClick = (clientX: number, clientY: number) => {
      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      this.desertScene.handleClick(mouse, this.camera);
    };

    this.renderer.domElement.addEventListener('click', (e) => {
      onClick(e.clientX, e.clientY);
    });

    this.renderer.domElement.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        onClick(touch.clientX, touch.clientY);
      }
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.desertScene.update();
    this.controls.update();
    this.renderer.render(this.desertScene.scene, this.camera);
  }
}

new App();
