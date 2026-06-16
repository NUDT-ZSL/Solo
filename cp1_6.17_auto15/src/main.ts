/**
 * ============================================================
 *  财经趋势力量场 - 主入口文件
 * ============================================================
 *
 * 【数据流向】
 *   模拟股票数据生成 → DataManager 数据管理 → ParticleSystem 粒子渲染
 *                                      ↓
 *                                ForceField 力场连接
 *
 * 【文件调用关系】
 *   main.ts (主控 / 场景编排)
 *     ├── 引入并实例化 DataManager (数据层)
 *     │   依赖: 无 (纯数据生成与查询)
 *     │
 *     ├── 引入并实例化 ParticleSystem (粒子渲染层)
 *     │   依赖: DataManager → 读取股票数据点、价格/成交量范围
 *     │   输出: 1800个三维粒子 (Mesh + MeshStandardMaterial)
 *     │
 *     ├── 引入并实例化 ForceField (力场连接层)
 *     │   依赖: DataManager → computeCorrelation() 计算价格相关系数
 *     │   依赖: ParticleSystem → getParticlePosition() 获取三维坐标
 *     │   输出: 动态半透明连线组
 *     │
 *     └── GUI / 事件 / UI 联动层 (本文件内)
 *         依赖: dat.gui 库
 *         输出: 实时参数调节 → 调用各子模块 update 方法
 *
 * 【模块职责】
 *   - dataManager.ts: 生成模拟数据、提供过滤/查询/相关系数计算接口
 *   - particleSystem.ts: 创建粒子、颜色映射、射线拾取、高亮、LOD
 *   - forceField.ts:    基于相关性生成力场连线、动态透明度、悬停高亮
 *   - main.ts:          Three.js 场景/相机/渲染器 + 模块编排 + 交互 + UI
 * ============================================================
 */

import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { DataManager } from './dataManager';
import { ParticleSystem } from './particleSystem';
import { ForceField } from './forceField';

/**
 * 应用主类 - 负责 Three.js 场景初始化、模块组合、
 * 交互事件处理、UI 面板管理和动画循环
 */
class FinanceForceFieldApp {
  // ============== Three.js 核心对象 ==============
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas!: HTMLCanvasElement;
  private clock!: THREE.Clock;

  // ============== 业务模块 ==============
  private dataManager!: DataManager;   // 数据层：模拟生成30×60=1800数据点
  private particleSystem!: ParticleSystem; // 渲染层：粒子系统
  private forceField!: ForceField;     // 效果层：力场连接线

  // ============== 选中状态 ==============
  private selectedPathLine: THREE.Line | null = null; // 贝塞尔轨迹线
  private selectedStockIndex: number = -1;

  // ============== GUI 参数 ==============
  private gui!: GUI;
  private guiParams = {
    particleSize: 0.08,           // 粒子大小 (0.05 - 0.2)
    correlationThreshold: 0.6,    // 力场连接阈值 (0.4 - 0.9)
    rotationSpeed: 0.5,           // 整体旋转速度 度/秒 (0 - 2)
    colorScheme: 'redGreen' as 'redGreen' | 'warmGradient', // 颜色方案
    showAxes: true                // 显示坐标轴
  };

  // ============== 相机控制 ==============
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: { radius: number; theta: number; phi: number } = {
    radius: 14,    // 缩放范围 2 - 20
    theta: Math.PI / 4,
    phi: Math.PI / 3
  };
  private targetSpherical = { ...this.spherical };

  // ============== 鼠标与交互 ==============
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private hoveredStockIndex: number = -1;

  // ============== 性能统计 ==============
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;

  // ============== 辅助对象 ==============
  private axesHelper: THREE.AxesHelper | null = null;

  // ============================================================
  //  构造函数 - 按顺序初始化所有模块
  //  流程: Three.js → 数据 → 粒子 → 力场 → GUI → 事件 → UI → 动画
  // ============================================================
  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.clock = new THREE.Clock();

    this.setupThreeJS();        // 1. 初始化场景/相机/渲染器
    this.setupDataAndVisuals(); // 2. 数据 → 粒子 → 力场
    this.setupGUI();            // 3. dat.gui 控制面板
    this.setupEventListeners(); // 4. 鼠标/触摸/resize 事件
    this.setupUI();             // 5. DOM UI 面板
    this.animate();             // 6. 启动渲染循环
  }

  // ============================================================
  //  1. Three.js 基础场景设置
  // ============================================================
  private setupThreeJS(): void {
    this.scene = new THREE.Scene();
    this.setupGradientBackground(); // 深蓝渐变背景 #0B0E1E → #1A1F3A

    // 透视相机：视场角60°，纵横比窗口尺寸，近远裁剪面 0.1 - 1000
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    // WebGL 渲染器：抗锯齿、高 DPI 适配、ACES 色调映射
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // 光照系统
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.6, 50);
    pointLight.position.set(-5, 5, -5);
    this.scene.add(pointLight);

    // 坐标轴参考 (可通过 GUI 开关)
    this.axesHelper = new THREE.AxesHelper(6);
    this.scene.add(this.axesHelper);

    // 底部参考网格
    const gridHelper = new THREE.GridHelper(12, 12, 0x333355, 0x1a1a33);
    gridHelper.position.y = -5.1;
    this.scene.add(gridHelper);
  }

  /**
   * 创建深蓝渐变背景纹理
   * 使用 CanvasTexture 作为 scene.background
   */
  private setupGradientBackground(): void {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const ctx = bgCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0B0E1E'); // 顶部深色
    gradient.addColorStop(1, '#1A1F3A'); // 底部稍浅
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = texture;
  }

  // ============================================================
  //  2. 数据与可视化模块初始化
  //  数据流向: DataManager → ParticleSystem → ForceField
  // ============================================================
  private setupDataAndVisuals(): void {
    // 第1层：数据管理器 - 生成30只股票 × 60交易日 = 1800 数据点
    this.dataManager = new DataManager(30, 60);

    // 第2层：粒子系统 - 从 dataManager 读取数据，渲染为 1800 个三维粒子
    this.particleSystem = new ParticleSystem(this.scene, this.dataManager, {
      particleSize: this.guiParams.particleSize,
      colorScheme: this.guiParams.colorScheme,
      emissiveIntensity: 0.2  // 发光材质强度
    });

    // 第3层：力场连接 - 依赖 dataManager 计算相关性 + particleSystem 提供坐标
    this.forceField = new ForceField(this.scene, this.dataManager, this.particleSystem, {
      correlationThreshold: this.guiParams.correlationThreshold,
      baseOpacity: 0.35,
      lineWidth: 0.005
    });
  }

  // ============================================================
  //  3. dat.gui 交互控制面板
  //  四项核心调节：粒子大小 / 力场阈值 / 旋转速度 / 颜色方案
  // ============================================================
  private setupGUI(): void {
    this.gui = new GUI({ width: 260 });

    // 样式定制
    const guiDom = this.gui.domElement;
    guiDom.style.position = 'absolute';
    guiDom.style.top = '20px';
    guiDom.style.right = '20px';
    guiDom.style.left = 'auto';
    guiDom.style.borderRadius = '12px';
    guiDom.style.overflow = 'hidden';

    // ---------- 粒子设置 ----------
    const particleFolder = this.gui.addFolder('粒子设置');
    particleFolder.open();

    particleFolder.add(this.guiParams, 'particleSize', 0.05, 0.2, 0.01)
      .name('粒子大小')
      .onChange((val: number) => {
        this.particleSystem.updateParticleSize(val);
      });

    particleFolder.add(this.guiParams, 'colorScheme', {
      '红涨绿跌': 'redGreen',
      '暖色渐变': 'warmGradient'
    })
      .name('颜色方案')
      .onChange((val: 'redGreen' | 'warmGradient') => {
        this.particleSystem.setColorScheme(val);
        if (this.selectedStockIndex >= 0) {
          this.drawStockPath(this.selectedStockIndex);
        }
      });

    // ---------- 力场设置 ----------
    const forceFolder = this.gui.addFolder('力场设置');
    forceFolder.open();

    forceFolder.add(this.guiParams, 'correlationThreshold', 0.4, 0.9, 0.05)
      .name('连接阈值')
      .onChange((val: number) => {
        this.forceField.updateCorrelationThreshold(val);
      });

    // ---------- 场景设置 ----------
    const sceneFolder = this.gui.addFolder('场景设置');
    sceneFolder.open();

    sceneFolder.add(this.guiParams, 'rotationSpeed', 0, 2, 0.1)
      .name('旋转速度 (°/s)');

    sceneFolder.add(this.guiParams, 'showAxes')
      .name('显示坐标轴')
      .onChange((val: boolean) => {
        if (this.axesHelper) this.axesHelper.visible = val;
      });
  }

  // ============================================================
  //  4. 事件监听器
  // ============================================================
  private setupEventListeners(): void {
    // 窗口尺寸变化 → 更新相机与渲染器
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 鼠标交互
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    // 滚轮缩放
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // 单击选中
    this.canvas.addEventListener('click', this.onClick.bind(this));

    // 触摸支持 (移动端)
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  // ============================================================
  //  5. UI 面板初始化
  // ============================================================
  private setupUI(): void {
    // 股票基础信息
    document.getElementById('stock-count')!.textContent =
      String(this.dataManager.getStockCount());
    document.getElementById('point-count')!.textContent =
      String(this.dataManager.getAllDataPoints().length);
    document.getElementById('selected-stock')!.textContent = '无';

    // 市场趋势
    const trend = this.dataManager.getMarketTrend();
    const trendEl = document.getElementById('market-trend')!;
    if (trend === 'bullish') {
      trendEl.textContent = '📈 看涨';
      trendEl.className = 'info-value price-up';
    } else if (trend === 'bearish') {
      trendEl.textContent = '📉 看跌';
      trendEl.className = 'info-value price-down';
    } else {
      trendEl.textContent = '➡️ 震荡';
      trendEl.className = 'info-value';
    }

    // 重置视角按钮
    document.getElementById('reset-view-btn')!.addEventListener('click', () => {
      this.targetSpherical = { radius: 14, theta: Math.PI / 4, phi: Math.PI / 3 };
      this.clearSelection();
    });

    // 切换力场线按钮
    document.getElementById('toggle-lines-btn')!.addEventListener('click', () => {
      const enabled = this.forceField.toggle();
      const btn = document.getElementById('toggle-lines-btn')!;
      btn.textContent = enabled ? '隐藏力场线' : '显示力场线';
    });

    // 关闭详情面板
    document.getElementById('close-detail')!.addEventListener('click', () => {
      this.hideDetailPanel();
    });
  }

  // ============================================================
  //  窗口 resize 响应
  //  自适应不同分辨率：桌面、笔记本
  // ============================================================
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // ============================================================
  //  鼠标交互：拖拽旋转
  // ============================================================
  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e.clientX, e.clientY);

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetSpherical.theta -= deltaX * 0.005;
      this.targetSpherical.phi = Math.max(
        0.08,
        Math.min(Math.PI - 0.08, this.targetSpherical.phi - deltaY * 0.005)
      );

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    } else {
      this.handleHover();
    }
  }

  /**
   * 滚轮缩放：缩放范围 2 - 20 单位
   */
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    this.targetSpherical.radius = Math.max(
      2,
      Math.min(20, this.targetSpherical.radius * zoomFactor)
    );
  }

  /**
   * 单击粒子 → 选中股票，绘制轨迹，弹出信息面板
   */
  private onClick(): void {
    if (this.isDragging) return;

    const result = this.particleSystem.detectClick(this.mouse, this.camera);
    if (result) {
      this.selectStock(result.stockIndex, result.dayIndex);
    } else {
      this.clearSelection();
    }
  }

  // ============================================================
  //  触摸支持 (移动端)
  // ============================================================
  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.isDragging = true;
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      this.updateMouse(touch.clientX, touch.clientY);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.previousMousePosition.x;
      const deltaY = touch.clientY - this.previousMousePosition.y;

      this.targetSpherical.theta -= deltaX * 0.005;
      this.targetSpherical.phi = Math.max(
        0.08,
        Math.min(Math.PI - 0.08, this.targetSpherical.phi - deltaY * 0.005)
      );

      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      this.updateMouse(touch.clientX, touch.clientY);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.isDragging && e.changedTouches.length === 1) {
      const result = this.particleSystem.detectClick(this.mouse, this.camera);
      if (result) {
        this.selectStock(result.stockIndex, result.dayIndex);
      }
    }
    this.isDragging = false;
  }

  /**
   * 将屏幕坐标转换为 Three.js 标准化设备坐标 (-1 ~ 1)
   */
  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 悬停处理：射线检测 → 高亮股票粒子 + 力场连线变金色
   */
  private handleHover(): void {
    const hovered = this.particleSystem.detectHover(this.mouse, this.camera);

    if (hovered !== this.hoveredStockIndex) {
      // 清除之前的悬停高亮 (不影响已选中的)
      if (this.hoveredStockIndex >= 0 && this.hoveredStockIndex !== this.selectedStockIndex) {
        if (this.selectedStockIndex >= 0) {
          this.particleSystem.highlightStock(this.selectedStockIndex);
        } else {
          this.particleSystem.clearHighlight();
        }
        this.forceField.clearHover();
      }

      this.hoveredStockIndex = hovered;

      if (hovered >= 0 && hovered !== this.selectedStockIndex) {
        this.particleSystem.hoverHighlightStock(hovered);
        this.forceField.setHoveredStock(hovered);
        this.canvas.style.cursor = 'pointer';
      } else if (hovered < 0) {
        if (this.selectedStockIndex < 0) {
          this.particleSystem.clearHighlight();
        } else {
          this.particleSystem.highlightStock(this.selectedStockIndex);
        }
        this.canvas.style.cursor = 'grab';
      }
    }
  }

  // ============================================================
  //  股票选中：高亮 + 贝塞尔轨迹 + 详情面板
  // ============================================================
  private selectStock(stockIndex: number, _dayIndex: number): void {
    this.selectedStockIndex = stockIndex;
    this.particleSystem.highlightStock(stockIndex);
    this.forceField.setHoveredStock(stockIndex);
    this.drawStockPath(stockIndex);   // 贝塞尔曲线完整轨迹
    this.showDetailPanel(stockIndex); // 信息面板

    const stock = this.dataManager.getStock(stockIndex);
    if (stock) {
      document.getElementById('selected-stock')!.textContent = stock.code;
    }
  }

  private clearSelection(): void {
    this.selectedStockIndex = -1;
    this.hoveredStockIndex = -1;
    this.particleSystem.clearHighlight();
    this.forceField.clearHover();
    this.removeStockPath();
    this.hideDetailPanel();
    document.getElementById('selected-stock')!.textContent = '无';
  }

  /**
   * 使用 Catmull-Rom 贝塞尔曲线绘制单只股票 60 个数据点的完整轨迹
   */
  private drawStockPath(stockIndex: number): void {
    this.removeStockPath();

    const positions = this.particleSystem.getStockPositions(stockIndex);
    if (positions.length < 2) return;

    // CatmullRom 曲线 - 60个点的平滑插值
    const curve = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.5);
    const curvePoints = curve.getPoints(positions.length * 6); // 插值细分
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

    // 轨迹颜色 = 股票当前涨跌色
    const color = this.particleSystem.getStockLatestColor(stockIndex);

    // 主线 - 不透明
    const mainMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.95,
      linewidth: 0.02
    });
    const mainLine = new THREE.Line(geometry, mainMaterial);

    // 发光外描边 - 半透明粗线 (模拟发光效果)
    const glowMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.35,
      linewidth: 0.08
    });
    const glowLine = new THREE.Line(geometry, glowMaterial);

    mainLine.add(glowLine);
    this.scene.add(mainLine);
    this.selectedPathLine = mainLine;
  }

  private removeStockPath(): void {
    if (this.selectedPathLine) {
      this.selectedPathLine.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) {
            mat.forEach(m => m.dispose());
          } else {
            mat.dispose();
          }
        }
      });
      this.scene.remove(this.selectedPathLine);
      this.selectedPathLine = null;
    }
  }

  // ============================================================
  //  详情信息面板
  //  样式: 半透明深色背景 #1A1A2E, 圆角 8px
  // ============================================================
  private showDetailPanel(stockIndex: number): void {
    const stock = this.dataManager.getStock(stockIndex);
    if (!stock) return;

    const panel = document.getElementById('detail-panel')!;

    // 股票代码 + 名称
    document.getElementById('detail-stock-code')!.textContent =
      `${stock.code} · ${stock.name}`;

    // 最新价格
    document.getElementById('detail-price')!.textContent =
      `¥${stock.latestPrice.toFixed(2)}`;

    // 涨跌额与涨跌幅
    const changeEl = document.getElementById('detail-change')!;
    const pctEl = document.getElementById('detail-pct')!;

    if (stock.changeAmount >= 0) {
      changeEl.textContent = `+¥${stock.changeAmount.toFixed(2)}`;
      changeEl.style.color = '#FF4444';
      pctEl.textContent = `+${stock.changePercent.toFixed(2)}%`;
      pctEl.style.color = '#FF4444';
    } else {
      changeEl.textContent = `-¥${Math.abs(stock.changeAmount).toFixed(2)}`;
      changeEl.style.color = '#44FF44';
      pctEl.textContent = `${stock.changePercent.toFixed(2)}%`;
      pctEl.style.color = '#44FF44';
    }

    // 历史数据
    document.getElementById('detail-open')!.textContent =
      `¥${stock.initialPrice.toFixed(2)}`;
    document.getElementById('detail-high')!.textContent =
      `¥${stock.highPrice.toFixed(2)}`;
    document.getElementById('detail-low')!.textContent =
      `¥${stock.lowPrice.toFixed(2)}`;
    document.getElementById('detail-volume')!.textContent =
      this.formatVolume(stock.avgVolume);

    panel.style.display = 'block';
  }

  private hideDetailPanel(): void {
    document.getElementById('detail-panel')!.style.display = 'none';
  }

  private formatVolume(vol: number): string {
    if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿';
    if (vol >= 10000) return (vol / 10000).toFixed(2) + '万';
    return vol.toString();
  }

  // ============================================================
  //  相机位置更新 (球坐标)
  // ============================================================
  private updateCameraPosition(): void {
    const x = this.spherical.radius * Math.sin(this.spherical.phi) *
              Math.cos(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * Math.sin(this.spherical.phi) *
              Math.sin(this.spherical.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  // ============================================================
  //  FPS 与粒子数统计
  // ============================================================
  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      document.getElementById('fps-value')!.textContent = String(this.currentFps);
      document.getElementById('particle-count')!.textContent =
        String(this.particleSystem.getVisibleCount());
    }
  }

  // ============================================================
  //  主渲染循环
  // ============================================================
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    // 相机平滑插值 (阻尼效果)
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.12;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.12;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.12;
    this.updateCameraPosition();

    // 粒子系统自动旋转
    this.particleSystem.animate(delta, this.guiParams.rotationSpeed);

    // 力场动态透明度波动
    this.forceField.animate(delta, this.camera);

    // LOD 性能优化：根据相机距离调整细节
    const camDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    this.particleSystem.setLODLevel(camDistance);
    this.forceField.setLODLevel(camDistance);

    // 选中路径跟随粒子组旋转
    if (this.selectedPathLine) {
      this.selectedPathLine.rotation.y = this.particleSystem.getGroup().rotation.y;
    }

    // 渲染
    this.renderer.render(this.scene, this.camera);

    // 性能统计
    this.updateFPS();
  }
}

// ============================================================
//  DOM 加载完成后启动应用
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  new FinanceForceFieldApp();
});
