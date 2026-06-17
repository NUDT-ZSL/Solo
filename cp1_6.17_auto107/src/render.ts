import { Grass } from './grass';
import { Vine } from './vine';
import { HerbCluster } from './herb';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PANEL_WIDTH = 200;
const TREE_COUNT = 5;

const GRASS_MIN_COUNT = 20;
const GRASS_MAX_COUNT = 80;
const VINE_MIN_COUNT = 3;
const VINE_MAX_COUNT = 15;
const HERB_CLUSTERS = 2;
const MAX_HARVESTS_PER_CLUSTER = 5;

interface Tree {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HarvestMessage {
  text: string;
  startTime: number;
  opacity: number;
}

class VegetationSystem {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private controlPanel: HTMLDivElement;

  private grasses: Grass[] = [];
  private vines: Vine[] = [];
  private trees: Tree[] = [];
  private herbClusters: HerbCluster[] = [];

  private windStrength: number = 2;
  private windDirection: number = 1;
  private windChangeInterval: number = 3000;
  private lastWindChange: number = 0;

  private grassCount: number = 50;
  private vineCount: number = 8;

  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private isMouseDown: boolean = false;
  private isMouseDragging: boolean = false;
  private isMouseInCanvas: boolean = false;

  private lastFrameTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  // 性能监控
  private frameRenderTime: number = 0;
  private maxFrameRenderTime: number = 0;
  private frameTimeUpdateInterval: number = 500;
  private lastFrameTimeUpdate: number = 0;
  private readonly MAX_FRAME_TIME: number = 18; // 80株草叶时最大允许帧渲染时间(ms)

  private harvestMessages: HarvestMessage[] = [];

  private scale: number = 1;

  constructor() {
    this.container = document.createElement('div');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.controlPanel = document.createElement('div');

    this.initDOM();
    this.initTrees();
    this.initGrasses();
    this.initVines();
    this.initHerbClusters();
    this.bindEvents();
    this.updateCanvasScale();
    this.startGameLoop();
  }

  private initDOM(): void {
    const app = document.getElementById('app')!;
    app.appendChild(this.container);

    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';
    this.container.style.gap = '20px';
    this.container.style.flexWrap = 'wrap';

    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.border = '2px solid #000';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.cursor = 'default';
    this.container.appendChild(this.canvas);

    this.controlPanel.style.width = `${PANEL_WIDTH}px`;
    this.controlPanel.style.backgroundColor = '#2C3E50';
    this.controlPanel.style.borderRadius = '10px';
    this.controlPanel.style.padding = '16px';
    this.controlPanel.style.color = 'white';
    this.controlPanel.style.fontFamily = "'Microsoft YaHei', Arial, sans-serif";
    this.container.appendChild(this.controlPanel);

    this.createControlPanel();
  }

  private createControlPanel(): void {
    const title = document.createElement('div');
    title.textContent = '控制面板';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '16px';
    title.style.textAlign = 'center';
    this.controlPanel.appendChild(title);

    this.createSliderControl(
      '风力强度',
      0, 5, 0.5,
      this.windStrength,
      (value) => { this.windStrength = value; this.updateAllWind(); },
      'windSlider'
    );

    this.createSliderControl(
      '草叶数量',
      GRASS_MIN_COUNT, GRASS_MAX_COUNT, 5,
      this.grassCount,
      (value) => { this.grassCount = value; this.reinitGrasses(); },
      'grassSlider'
    );

    this.createSliderControl(
      '藤蔓数量',
      VINE_MIN_COUNT, VINE_MAX_COUNT, 1,
      this.vineCount,
      (value) => { this.vineCount = value; this.reinitVines(); },
      'vineSlider'
    );

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置';
    resetBtn.style.width = '80px';
    resetBtn.style.height = '32px';
    resetBtn.style.backgroundColor = '#E74C3C';
    resetBtn.style.color = 'white';
    resetBtn.style.border = 'none';
    resetBtn.style.borderRadius = '6px';
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.fontSize = '14px';
    resetBtn.style.transition = 'background-color 0.15s ease';
    resetBtn.style.marginTop = '20px';
    resetBtn.style.display = 'block';
    resetBtn.style.marginLeft = 'auto';
    resetBtn.style.marginRight = 'auto';

    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.backgroundColor = '#C0392B';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.backgroundColor = '#E74C3C';
    });
    resetBtn.addEventListener('click', () => this.resetAll());

    this.controlPanel.appendChild(resetBtn);
  }

  private createSliderControl(
    label: string,
    min: number, max: number, step: number,
    initialValue: number,
    onChange: (value: number) => void,
    id: string
  ): void {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '16px';

    const labelEl = document.createElement('div');
    labelEl.style.display = 'flex';
    labelEl.style.justifyContent = 'space-between';
    labelEl.style.marginBottom = '8px';
    labelEl.style.fontSize = '14px';

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueText = document.createElement('span');
    valueText.textContent = initialValue.toString();
    valueText.id = `${id}Value`;
    valueText.style.fontWeight = 'bold';

    labelEl.appendChild(labelText);
    labelEl.appendChild(valueText);
    wrapper.appendChild(labelEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = initialValue.toString();
    slider.id = id;
    slider.style.width = '100%';
    slider.style.cursor = 'pointer';
    slider.style.transition = 'opacity 0.15s ease';

    slider.addEventListener('input', (e) => {
      let value = parseFloat((e.target as HTMLInputElement).value);
      // 按步长取整，确保值与步长一致
      value = Math.round(value / step) * step;
      // 处理浮点数精度问题
      value = parseFloat(value.toFixed(10));
      // 确保值在范围内
      value = Math.max(min, Math.min(max, value));
      // 更新滑块显示值
      (e.target as HTMLInputElement).value = value.toString();
      // 更新显示文本
      if (step < 1) {
        valueText.textContent = value.toFixed(1);
      } else {
        valueText.textContent = value.toString();
      }
      onChange(value);
    });

    wrapper.appendChild(slider);
    this.controlPanel.appendChild(wrapper);
  }

  private initTrees(): void {
    this.trees = [];
    const minX = 80;
    const maxX = CANVAS_WIDTH - 80;
    const spacing = (maxX - minX) / (TREE_COUNT + 1);

    for (let i = 0; i < TREE_COUNT; i++) {
      const x = minX + spacing * (i + 1) + (Math.random() - 0.5) * 40;
      this.trees.push({
        x,
        y: 450,
        width: 30,
        height: 120
      });
    }
  }

  private initGrasses(): void {
    this.grasses = [];
    for (let i = 0; i < this.grassCount; i++) {
      const x = 20 + Math.random() * (CANVAS_WIDTH - 40);
      const baseY = 450 + Math.random() * 50;
      const heightOptions = [30, 35, 40, 45, 50, 55, 60];
      const height = heightOptions[Math.floor(Math.random() * heightOptions.length)];

      this.grasses.push(new Grass({
        x,
        baseY,
        height,
        windStrength: this.windStrength,
        windDirection: this.windDirection
      }));
    }
  }

  private reinitGrasses(): void {
    this.initGrasses();
  }

  private initVines(): void {
    this.vines = [];
    if (this.trees.length === 0) return;

    for (let i = 0; i < this.vineCount; i++) {
      const treeIndex = Math.floor(Math.random() * this.trees.length);
      const tree = this.trees[treeIndex];
      const startX = tree.x + (Math.random() - 0.5) * tree.width * 0.8;
      const startY = tree.y - tree.height;
      const length = 60 + Math.random() * 100;
      const nodeCount = 4 + Math.floor(Math.random() * 3);

      this.vines.push(new Vine({
        startX,
        startY,
        length,
        nodeCount,
        gravity: 9.8,
        windStrength: this.windStrength,
        windDirection: this.windDirection
      }));
    }
  }

  private reinitVines(): void {
    this.initVines();
  }

  private initHerbClusters(): void {
    this.herbClusters = [];
    const clusterPositions = [
      { x: 120, y: 490 },
      { x: CANVAS_WIDTH - 120, y: 490 }
    ];

    for (let i = 0; i < HERB_CLUSTERS; i++) {
      const count = 1 + Math.floor(Math.random() * 3);
      this.herbClusters.push(new HerbCluster({
        centerX: clusterPositions[i].x,
        baseY: clusterPositions[i].y,
        count,
        maxHarvests: MAX_HARVESTS_PER_CLUSTER
      }));
    }
  }

  private updateAllWind(): void {
    for (const grass of this.grasses) {
      grass.setWind(this.windStrength, this.windDirection);
    }
    for (const vine of this.vines) {
      vine.setWind(this.windStrength, this.windDirection);
    }
  }

  private resetAll(): void {
    this.windStrength = 2;
    this.grassCount = 50;
    this.vineCount = 8;
    this.windDirection = 1;

    (document.getElementById('windSlider') as HTMLInputElement).value = '2';
    (document.getElementById('windSliderValue') as HTMLElement).textContent = '2';
    (document.getElementById('grassSlider') as HTMLInputElement).value = '50';
    (document.getElementById('grassSliderValue') as HTMLElement).textContent = '50';
    (document.getElementById('vineSlider') as HTMLInputElement).value = '8';
    (document.getElementById('vineSliderValue') as HTMLElement).textContent = '8';

    this.initTrees();
    this.initGrasses();
    this.initVines();
    for (const cluster of this.herbClusters) {
      cluster.reset();
    }
    this.harvestMessages = [];
    // 重置性能统计
    this.frameRenderTime = 0;
    this.maxFrameRenderTime = 0;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseenter', () => this.handleMouseEnter());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));

    window.addEventListener('resize', () => this.updateCanvasScale());
  }

  private getCanvasMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scale;
    const y = (e.clientY - rect.top) / this.scale;
    return { x, y };
  }

  private handleMouseEnter(): void {
    this.isMouseInCanvas = true;
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasMousePos(e);
    // 保存上一帧位置用于线段碰撞检测
    this.lastMouseX = this.mouseX;
    this.lastMouseY = this.mouseY;
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.isMouseDown && this.isMouseInCanvas) {
      this.isMouseDragging = true;
      this.checkGrassCollision();
    }

    this.checkHerbHover();
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasMousePos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    // 初始化上一帧位置，避免从(0,0)开始的线段检测
    this.lastMouseX = pos.x;
    this.lastMouseY = pos.y;
    this.isMouseDown = true;
    this.isMouseDragging = false;
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isMouseDown = false;
    setTimeout(() => { this.isMouseDragging = false; }, 10);
  }

  private handleMouseLeave(): void {
    // 鼠标离开画布时重置所有拖拽状态，防止状态不一致
    this.isMouseDown = false;
    this.isMouseDragging = false;
    this.isMouseInCanvas = false;
  }

  private handleClick(e: MouseEvent): void {
    if (this.isMouseDragging) return;

    const pos = this.getCanvasMousePos(e);
    const currentTime = performance.now();

    for (const vine of this.vines) {
      if (vine.checkClick(pos.x, pos.y, currentTime)) {
        return;
      }
    }

    for (let i = 0; i < this.herbClusters.length; i++) {
      if (this.herbClusters[i].checkClick(pos.x, pos.y, currentTime)) {
        this.addHarvestMessage('采集成功！');
        return;
      }
    }
  }

  private checkGrassCollision(): void {
    const dx = this.mouseX - this.lastMouseX;
    const moveDirection = dx >= 0 ? 1 : -1;

    // 使用线段碰撞检测，覆盖鼠标拖拽的完整路径
    // 避免快速移动鼠标时跳过草叶导致漏检
    for (const grass of this.grasses) {
      grass.checkSegmentCollision(
        this.lastMouseX, this.lastMouseY,
        this.mouseX, this.mouseY,
        moveDirection
      );
    }
  }

  private checkHerbHover(): void {
    const currentTime = performance.now();
    for (const cluster of this.herbClusters) {
      cluster.checkHover(this.mouseX, this.mouseY, currentTime);
    }
  }

  private addHarvestMessage(text: string): void {
    this.harvestMessages.push({
      text,
      startTime: performance.now(),
      opacity: 1
    });
  }

  private updateCanvasScale(): void {
    const windowWidth = window.innerWidth;
    const totalWidth = CANVAS_WIDTH + PANEL_WIDTH + 40;

    if (windowWidth < 900) {
      this.scale = (windowWidth * 0.85) / CANVAS_WIDTH;
    } else if (windowWidth < totalWidth + 40) {
      this.scale = (windowWidth - PANEL_WIDTH - 60) / CANVAS_WIDTH;
    } else {
      this.scale = 1;
    }

    if (this.scale > 1) this.scale = 1;

    this.canvas.style.width = `${CANVAS_WIDTH * this.scale}px`;
    this.canvas.style.height = `${CANVAS_HEIGHT * this.scale}px`;
  }

  private updateWind(currentTime: number): void {
    if (currentTime - this.lastWindChange > this.windChangeInterval) {
      this.lastWindChange = currentTime;
      this.windDirection = -1 + Math.random() * 2;
      this.updateAllWind();
    }
  }

  private updateFPS(_deltaTime: number, currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }

  private updateHarvestMessages(currentTime: number): void {
    for (let i = this.harvestMessages.length - 1; i >= 0; i--) {
      const msg = this.harvestMessages[i];
      const elapsed = currentTime - msg.startTime;

      if (elapsed > 3000) {
        this.harvestMessages.splice(i, 1);
      } else if (elapsed > 2000) {
        msg.opacity = 1 - (elapsed - 2000) / 1000;
      }
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;

    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#FFFFE0');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const groundGradient = ctx.createLinearGradient(0, 450, 0, 600);
    groundGradient.addColorStop(0, '#8B4513');
    groundGradient.addColorStop(0.3, '#6B4226');
    groundGradient.addColorStop(1, '#228B22');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, 450, CANVAS_WIDTH, 150);

    for (const tree of this.trees) {
      ctx.fillStyle = '#6B4226';
      ctx.fillRect(
        tree.x - tree.width / 2,
        tree.y - tree.height,
        tree.width,
        tree.height
      );

      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(tree.x, tree.y - tree.height, 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(tree.x - 20, tree.y - tree.height + 10, 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(tree.x + 20, tree.y - tree.height + 5, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFPS(): void {
    const ctx = this.ctx;

    // 使用相对坐标计算，确保在Canvas缩放时位置比例正确
    const marginX = 10;
    const marginY = 10;
    const boxWidth = 140;
    const boxHeight = 48;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.fillRoundRect(ctx, marginX, marginY, boxWidth, boxHeight, 6);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${this.fps}`, marginX + 8, marginY + 6);
    ctx.fillText(`帧时: ${this.frameRenderTime.toFixed(1)}ms`, marginX + 8, marginY + 22);
    ctx.fillText(`峰值: ${this.maxFrameRenderTime.toFixed(1)}ms`, marginX + 8, marginY + 38);
    ctx.restore();
  }

  private fillRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  private drawHarvestMessages(): void {
    const ctx = this.ctx;
    // 基于Canvas坐标系的相对位置，随Canvas整体缩放保持正确比例
    const startY = 50;
    const lineHeight = 30;
    const marginX = 20;
    let yOffset = startY;

    for (const msg of this.harvestMessages) {
      ctx.save();
      ctx.globalAlpha = msg.opacity;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px "Microsoft YaHei", Arial';
      ctx.textBaseline = 'top';
      ctx.fillText(msg.text, marginX, yOffset);
      ctx.restore();
      yOffset += lineHeight;
    }
  }

  private drawHerbCounters(): void {
    const ctx = this.ctx;
    // 基于Canvas坐标系的相对位置，随Canvas整体缩放保持正确比例
    const marginX = 20;
    const marginY = 10;

    ctx.save();
    ctx.fillStyle = '#4CAF50';
    ctx.font = '14px "Microsoft YaHei", Arial';
    ctx.textBaseline = 'bottom';

    if (this.herbClusters.length > 0) {
      const leftCluster = this.herbClusters[0];
      ctx.textAlign = 'left';
      ctx.fillText(
        `剩余: ${leftCluster.getRemainingHarvests()}/${leftCluster.getMaxHarvests()}`,
        marginX,
        CANVAS_HEIGHT - marginY
      );
    }

    if (this.herbClusters.length > 1) {
      const rightCluster = this.herbClusters[1];
      ctx.textAlign = 'right';
      ctx.fillText(
        `剩余: ${rightCluster.getRemainingHarvests()}/${rightCluster.getMaxHarvests()}`,
        CANVAS_WIDTH - marginX,
        CANVAS_HEIGHT - marginY
      );
    }

    ctx.restore();
  }

  private startGameLoop(): void {
    const loop = (currentTime: number) => {
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      this.updateWind(currentTime);
      this.updateFPS(deltaTime, currentTime);
      this.updateHarvestMessages(currentTime);

      // ========== 更新阶段开始 ==========
      const updateStartTime = performance.now();

      for (const grass of this.grasses) {
        grass.update(deltaTime, currentTime);
      }
      for (const vine of this.vines) {
        vine.update(deltaTime, currentTime);
      }
      for (const cluster of this.herbClusters) {
        cluster.update(deltaTime, currentTime);
      }

      // ========== 渲染阶段开始 ==========
      const renderStartTime = performance.now();

      this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.drawBackground();

      for (const grass of this.grasses) {
        grass.draw(this.ctx);
      }

      for (const vine of this.vines) {
        vine.draw(this.ctx);
      }

      for (const cluster of this.herbClusters) {
        cluster.draw(this.ctx, currentTime);
      }

      this.drawFPS();
      this.drawHarvestMessages();
      this.drawHerbCounters();

      // ========== 帧结束，性能统计 ==========
      const frameEndTime = performance.now();
      const totalFrameTime = frameEndTime - updateStartTime;
      const _renderTime = frameEndTime - renderStartTime;

      // 定期更新帧时间统计
      if (currentTime - this.lastFrameTimeUpdate >= this.frameTimeUpdateInterval) {
        this.lastFrameTimeUpdate = currentTime;
        this.frameRenderTime = totalFrameTime;
        this.maxFrameRenderTime = Math.max(this.maxFrameRenderTime, totalFrameTime);

        // 当草叶数量达到80株时，检查是否超过18ms限制
        if (this.grasses.length >= 80 && totalFrameTime > this.MAX_FRAME_TIME) {
          console.warn(
            `[性能警告] 80株草叶时单帧渲染时间 ${totalFrameTime.toFixed(1)}ms ` +
            `超过限制 ${this.MAX_FRAME_TIME}ms`
          );
        }
      }

      requestAnimationFrame(loop);
    };

    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = performance.now();
    this.lastFrameTimeUpdate = performance.now();
    requestAnimationFrame(loop);
  }
}

new VegetationSystem();
