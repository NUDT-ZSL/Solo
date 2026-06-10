import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CloudManager } from './cloudManager';
import { LightingController } from './lightingController';

interface Snapshot {
  positions: Float32Array;
  basePositions: Float32Array;
  params: { windSpeed: number; humidity: number; temperature: number };
  thumbnail: string;
  id: number;
}

/**
 * 云海幻境主应用类
 *
 * 负责:
 * - Three.js 场景/相机/渲染器初始化
 * - OrbitControls 视角交互
 * - UI 控制面板和事件监听
 * - 云层与光照系统的调度
 * - 快照系统的管理
 * - 动画循环驱动
 *
 * 数据流向:
 * 用户交互(滑块/鼠标/点击)
 * → 事件处理 → 调用 CloudManager/LightingController 方法
 * → 更新内部状态 → animate() 每帧渲染
 */
class CloudIllusionApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cloudManager: CloudManager;
  private lightingController: LightingController;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private snapshots: Snapshot[] = [];
  private maxSnapshots = 5;
  private snapshotIdCounter = 0;

  private clickedParticle: { index: number; startTime: number } | null = null;
  private labelVisible = false;

  private fpsFrames = 0;
  private fpsTime = 0;

  /**
   * 构造函数 - 初始化整个应用
   *
   * 初始化顺序:
   * 1. Scene + Fog
   * 2. Camera
   * 3. Renderer
   * 4. OrbitControls
   * 5. Raycaster
   * 6. 星空背景
   * 7. CloudManager
   * 8. LightingController
   * 9. UI 事件绑定
   * 10. 启动动画循环
   */
  constructor() {
    const canvas = document.getElementById('cloud-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.003);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 35, 80);
    this.camera.lookAt(0, 5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0e1a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 5, 0);
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 5;
    this.mouse = new THREE.Vector2();

    this.createStarField();
    this.cloudManager = new CloudManager(this.scene, this.camera);
    this.lightingController = new LightingController(this.scene);

    this.clock = new THREE.Clock();

    this.setupUI();
    this.setupEventListeners();

    this.animate();
  }

  /**
   * 创建星空背景
   * 使用 Points 渲染 800 颗随机分布的星星
   * 球体分布，距离中心 400-600 单位
   */
  private createStarField(): void {
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 400 + Math.random() * 200;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xccddff,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  /**
   * 初始化 UI 控制面板
   * 绑定三个滑块的 input 事件
   * 绑定快照按钮的 click 事件
   */
  private setupUI(): void {
    this.setupSlider('wind-slider', 'wind-value', 'wind-glow', -5, 5, (val) => {
      return val.toFixed(1);
    });
    this.setupSlider('humidity-slider', 'humidity-value', 'humidity-glow', 0, 100, (val) => {
      return Math.round(val).toString();
    });
    this.setupSlider('temp-slider', 'temp-value', 'temp-glow', -10, 40, (val) => {
      return Math.round(val) + '°C';
    });

    this.updateSliderGlow('wind-slider', 'wind-glow', -5, 5);
    this.updateSliderGlow('humidity-slider', 'humidity-glow', 0, 100);
    this.updateSliderGlow('temp-slider', 'temp-glow', -10, 40);

    const snapshotBtn = document.getElementById('snapshot-btn')!;
    snapshotBtn.addEventListener('click', () => this.takeSnapshot());
  }

  /**
   * 设置单个滑块的事件监听
   * @param sliderId - 滑块元素 ID
   * @param valueId - 值显示元素 ID
   * @param glowId - 发光轨迹元素 ID
   * @param min - 滑块最小值
   * @param max - 滑块最大值
   * @param formatter - 值格式化函数
   *
   * 数据流向:
   * 用户拖动滑块 → input 事件
   * → 更新显示值 → 更新发光条 → 调用 updateCloudParams()
   * → CloudManager.setParameters() 更新粒子属性
   */
  private setupSlider(
    sliderId: string,
    valueId: string,
    glowId: string,
    min: number,
    max: number,
    formatter: (val: number) => string
  ): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId)!;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueDisplay.textContent = formatter(val);
      this.updateSliderGlow(sliderId, glowId, min, max);
      this.updateCloudParams();
    });
  }

  /**
   * 更新滑块发光轨迹的宽度和颜色
   * @param sliderId - 滑块元素 ID
   * @param glowId - 发光轨迹元素 ID
   * @param min - 最小值
   * @param max - 最大值
   *
   * 颜色渐变: 低值蓝(4A9EFF) → 中值绿(4AFF8A) → 高值红(FF6A4A)
   */
  private updateSliderGlow(sliderId: string, glowId: string, min: number, max: number): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const glow = document.getElementById(glowId)!;
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;

    glow.style.width = percent + '%';

    let color: string;
    if (percent < 33) {
      const t = percent / 33;
      color = this.lerpColor('#4A9EFF', '#4AFF8A', t);
    } else if (percent < 66) {
      const t = (percent - 33) / 33;
      color = this.lerpColor('#4AFF8A', '#FFAA4A', t);
    } else {
      const t = (percent - 66) / 34;
      color = this.lerpColor('#FFAA4A', '#FF6A4A', t);
    }

    glow.style.background = `linear-gradient(90deg, ${color}, ${color}88)`;
    glow.style.boxShadow = `0 0 8px ${color}88, 0 0 16px ${color}44`;
  }

  /**
   * 十六进制颜色线性插值
   * @param color1 - 起始颜色 #RRGGBB
   * @param color2 - 结束颜色 #RRGGBB
   * @param t - 插值因子 0~1
   * @returns 插值后的颜色 #RRGGBB
   */
  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * 从滑块读取参数并更新云层
   *
   * 数据流向:
   * 滑块值 → setParameters()
   * → CloudManager 内部更新 sizes/colors/opacities
   * → 标记 BufferGeometry 属性需要更新
   */
  private updateCloudParams(): void {
    const windSpeed = parseFloat((document.getElementById('wind-slider') as HTMLInputElement).value);
    const humidity = parseFloat((document.getElementById('humidity-slider') as HTMLInputElement).value);
    const temperature = parseFloat((document.getElementById('temp-slider') as HTMLInputElement).value);
    this.cloudManager.setParameters(windSpeed, humidity, temperature);
  }

  /**
   * 设置全局事件监听
   * - Canvas 点击事件（粒子点击检测）
   * - Window  resize 事件（响应式）
   */
  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', (event) => this.onCanvasClick(event));

    window.addEventListener('resize', () => this.onResize());
  }

  /**
   * Canvas 点击处理 - 检测点击的粒子
   * @param event - 鼠标点击事件
   *
   * 使用 Raycaster 检测 Points 是否被点击
   * 命中后:
   * 1. 调用 createHaloPulse() 创建光晕脉冲
   * 2. 记录被点击粒子索引
   * 3. 显示悬浮标签（坐标+密度）
   */
  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.cloudManager.getPoints());

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) {
        const elapsedTime = this.clock.getElapsedTime();
        this.cloudManager.createHaloPulse(index, elapsedTime);
        this.clickedParticle = { index, startTime: elapsedTime };
        this.showParticleLabel(index);
      }
    }
  }

  /**
   * 显示粒子悬浮标签
   * @param index - 粒子索引
   *
   * 显示内容:
   * - XYZ 坐标
   * - 周围粒子密度
   *
   * 标签跟随粒子屏幕位置
   */
  private showParticleLabel(index: number): void {
    const pos = this.cloudManager.getParticlePosition(index);
    const density = this.cloudManager.getParticleDensity(index);

    const coordsEl = document.getElementById('label-coords')!;
    const densityEl = document.getElementById('label-density')!;
    const label = document.getElementById('particle-label')!;

    coordsEl.textContent = `X:${pos.x.toFixed(1)} Y:${pos.y.toFixed(1)} Z:${pos.z.toFixed(1)}`;
    densityEl.textContent = `周围密度: ${density} 粒子`;

    label.classList.add('visible');
    this.labelVisible = true;

    this.updateLabelPosition(index);
  }

  /**
   * 更新悬浮标签的屏幕位置
   * @param index - 粒子索引
   *
   * 将粒子 3D 坐标投影到屏幕坐标
   * 标签显示在粒子右上方
   */
  private updateLabelPosition(index: number): void {
    const pos = this.cloudManager.getParticlePosition(index);
    const vector = pos.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    const label = document.getElementById('particle-label')!;
    label.style.left = (x + 15) + 'px';
    label.style.top = (y - 30) + 'px';
  }

  /**
   * 隐藏粒子悬浮标签
   */
  private hideParticleLabel(): void {
    const label = document.getElementById('particle-label')!;
    label.classList.remove('visible');
    this.labelVisible = false;
    this.clickedParticle = null;
  }

  /**
   * 记录当前云层状态为快照
   *
   * 快照内容:
   * - 粒子位置数组
   * - 粒子基准位置数组
   * - 参数组合（风速/湿度/温度）
   * - 50x50 缩略图（由 CloudManager.generateThumbnail() 生成）
   *
   * 最多保存 5 条，超出后移除最旧的
   *
   * 数据流向:
   * 点击"记录快照"按钮 → takeSnapshot()
   * → 从 CloudManager 获取当前状态
   * → 生成缩略图 dataURL
   * → 存入 snapshots 数组
   * → 重新渲染快照列表
   */
  private takeSnapshot(): void {
    const positions = this.cloudManager.getPositions();
    const basePositions = this.cloudManager.getBasePositions();
    const params = this.cloudManager.getCurrentParams();
    const thumbnail = this.cloudManager.generateThumbnail();

    const snapshot: Snapshot = {
      positions,
      basePositions,
      params,
      thumbnail,
      id: this.snapshotIdCounter++,
    };

    if (this.snapshots.length >= this.maxSnapshots) {
      this.snapshots.shift();
    }
    this.snapshots.push(snapshot);

    this.renderSnapshotList();
  }

  /**
   * 渲染快照卡片列表
   *
   * 每张卡片包含:
   * - 50x50 缩略图
   * - 参数信息
   * - 删除按钮
   *
   * 点击卡片恢复对应快照
   * 点击删除按钮移除快照
   */
  private renderSnapshotList(): void {
    const container = document.getElementById('snapshot-cards')!;
    container.innerHTML = '';

    this.snapshots.forEach((snapshot, index) => {
      const card = document.createElement('div');
      card.className = 'snapshot-card';
      card.innerHTML = `
        <img src="${snapshot.thumbnail}" alt="快照 ${index + 1}">
        <div class="snapshot-info">
          风:${snapshot.params.windSpeed.toFixed(1)} 湿:${snapshot.params.humidity}<br>
          温:${snapshot.params.temperature}°C
        </div>
        <button class="snapshot-delete" data-index="${index}">×</button>
      `;

      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('snapshot-delete')) return;
        this.restoreSnapshot(index);
      });

      const deleteBtn = card.querySelector('.snapshot-delete')!;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSnapshot(index);
      });

      container.appendChild(card);
    });
  }

  /**
   * 恢复指定快照的状态
   * @param index - 快照索引
   *
   * 恢复内容:
   * - 粒子位置（3秒平滑过渡动画）
   * - 三个滑块参数
   * - 云层内部参数
   *
   * 数据流向:
   * 点击快照卡片 → restoreSnapshot()
   * → CloudManager.startTransition() 启动位置过渡
   * → 同步更新滑块 UI
   * → CloudManager.setParameters() 更新颜色/大小
   * → 3秒内平滑过渡完成
   */
  private restoreSnapshot(index: number): void {
    const snapshot = this.snapshots[index];
    if (!snapshot) return;

    this.cloudManager.startTransition(snapshot.positions);

    const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
    const humiditySlider = document.getElementById('humidity-slider') as HTMLInputElement;
    const tempSlider = document.getElementById('temp-slider') as HTMLInputElement;

    windSlider.value = snapshot.params.windSpeed.toString();
    humiditySlider.value = snapshot.params.humidity.toString();
    tempSlider.value = snapshot.params.temperature.toString();

    document.getElementById('wind-value')!.textContent = snapshot.params.windSpeed.toFixed(1);
    document.getElementById('humidity-value')!.textContent = snapshot.params.humidity.toString();
    document.getElementById('temp-value')!.textContent = snapshot.params.temperature + '°C';

    this.updateSliderGlow('wind-slider', 'wind-glow', -5, 5);
    this.updateSliderGlow('humidity-slider', 'humidity-glow', 0, 100);
    this.updateSliderGlow('temp-slider', 'temp-glow', -10, 40);

    this.cloudManager.setParameters(
      snapshot.params.windSpeed,
      snapshot.params.humidity,
      snapshot.params.temperature
    );

    document.querySelectorAll('.snapshot-card').forEach((c) => c.classList.remove('active'));
    const cards = document.querySelectorAll('.snapshot-card');
    if (cards[index]) cards[index].classList.add('active');
  }

  /**
   * 删除指定快照
   * @param index - 快照索引
   */
  private deleteSnapshot(index: number): void {
    this.snapshots.splice(index, 1);
    this.renderSnapshotList();
  }

  /**
   * 窗口大小变化处理
   * 更新相机宽高比和渲染器尺寸
   */
  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * 动画循环主函数
   *
   * 每帧执行:
   * 1. OrbitControls 更新（阻尼效果）
   * 2. CloudManager.update() - 粒子位置/大小/颜色/视差/光晕
   * 3. LightingController.update() - 光照日夜循环
   * 4. 悬浮标签位置更新
   * 5. WebGL 渲染
   * 6. FPS 计数（0.5秒更新一次）
   *
   * 数据流向:
   * requestAnimationFrame → animate()
   * → 计算 deltaTime/elapsedTime
   * → 调用各子系统 update
   * → renderer.render() 输出到屏幕
   */
  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    this.cloudManager.update(deltaTime, elapsedTime);
    this.lightingController.update(elapsedTime);

    if (this.labelVisible && this.clickedParticle) {
      const age = elapsedTime - this.clickedParticle.startTime;
      if (age > 2) {
        this.hideParticleLabel();
      } else {
        this.updateLabelPosition(this.clickedParticle.index);
      }
    }

    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime);
      document.getElementById('fps-counter')!.textContent = `FPS: ${fps}`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }
}

new CloudIllusionApp();
