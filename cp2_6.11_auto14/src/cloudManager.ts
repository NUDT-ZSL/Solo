import * as THREE from 'three';
import { PerlinNoise } from './perlinNoise';

const PARTICLE_COUNT = 1000;
const CLOUD_SPREAD = 80;
const CLOUD_HEIGHT = 20;
const PARTICLE_SIZE_MIN = 10;
const PARTICLE_SIZE_MAX = 30;

interface HaloPulse {
  sprite: THREE.Sprite;
  startTime: number;
  duration: number;
}

export class CloudManager {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private basePositions: Float32Array;
  private sizes: Float32Array;
  private colors: Float32Array;
  private opacities: Float32Array;
  private perlin: PerlinNoise;
  private halos: HaloPulse[] = [];

  private windSpeed: number = 0;
  private humidity: number = 50;
  private temperature: number = 15;

  private transitionFrom: Float32Array | null = null;
  private transitionTo: Float32Array | null = null;
  private transitionProgress: number = 1;
  private transitionDuration: number = 3;

  private camera: THREE.Camera;
  private scene: THREE.Scene;

  private lastCameraRotation: number = 0;
  private parallaxOffsets: Float32Array;

  private static readonly vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float customOpacity;
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      vColor = customColor;
      vOpacity = customOpacity;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (280.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 1.0, 128.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private static readonly fragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      float core = smoothstep(0.5, 0.15, r);
      float glow = smoothstep(0.5, 0.3, r) * 0.4;
      float alpha = (core + glow) * vOpacity;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  /**
   * 构造函数 - 初始化云层管理系统
   * @param scene - Three.js 场景对象，用于添加粒子和光晕
   * @param camera - Three.js 相机对象，用于计算视差和透视效果
   *
   * 数据流向:
   * main.ts 构造时传入 scene 和 camera
   * → CloudManager 内部维护粒子状态
   * → 通过 update() 方法每帧更新后写入 BufferGeometry
   * → Three.js 渲染循环读取 BufferGeometry 渲染
   */
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.perlin = new PerlinNoise(42);

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.opacities = new Float32Array(PARTICLE_COUNT);
    this.parallaxOffsets = new Float32Array(PARTICLE_COUNT * 3);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('customOpacity', new THREE.BufferAttribute(this.opacities, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: CloudManager.vertexShader,
      fragmentShader: CloudManager.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.applyParameters();
  }

  /**
   * 初始化粒子基础位置和属性
   * 使用高斯随机分布生成云团形状，粒子集中在中心区域
   *
   * 内部方法，在构造函数中调用一次
   * 输出: basePositions(基准位置), sizes(初始大小), opacities(初始透明度)
   */
  private initParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const cx = this.gaussianRandom() * CLOUD_SPREAD * 0.6;
      const cy = this.gaussianRandom() * CLOUD_HEIGHT * 0.3 + 5;
      const cz = this.gaussianRandom() * CLOUD_SPREAD * 0.6;

      this.basePositions[i3] = cx;
      this.basePositions[i3 + 1] = cy;
      this.basePositions[i3 + 2] = cz;

      this.positions[i3] = cx;
      this.positions[i3 + 1] = cy;
      this.positions[i3 + 2] = cz;

      this.sizes[i] = PARTICLE_SIZE_MIN + Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
      this.opacities[i] = 0.4 + Math.random() * 0.3;
    }
  }

  /**
   * 生成高斯分布的随机数
   * @returns 标准正态分布随机数（均值0，标准差约1）
   *
   * 使用 Box-Muller 变换
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * 设置云层参数（风速、湿度、温度）
   * @param windSpeed - 风速，范围 -5 到 5，影响粒子移动速度和方向
   * @param humidity - 湿度，范围 0 到 100，影响粒子大小和透明度
   * @param temperature - 温度，范围 -10 到 40，影响粒子颜色冷暖
   *
   * 数据流向:
   * main.ts 监听滑块 input 事件 → 调用 setParameters()
   * → 内部更新 windSpeed/humidity/temperature 变量
   * → 调用 applyParameters() 同步更新所有粒子属性
   * → 标记 BufferGeometry 需要更新
   */
  setParameters(windSpeed: number, humidity: number, temperature: number): void {
    this.windSpeed = windSpeed;
    this.humidity = humidity;
    this.temperature = temperature;
    this.applyParameters();
  }

  /**
   * 根据当前参数应用到所有粒子
   * 更新粒子大小、颜色和透明度
   *
   * 湿度影响: 粒子大小从 PARTICLE_SIZE_MIN 到 PARTICLE_SIZE_MAX 线性变化
   * 温度影响: 低温偏蓝(100,150,255)，高温偏红(255,150,100)，中间线性过渡
   *
   * 内部方法，由 setParameters() 和 update() 调用
   * 输出: sizes 属性、colors 属性、opacities 属性更新
   */
  private applyParameters(): void {
    const humidityFactor = this.humidity / 100;
    const tempNorm = (this.temperature + 10) / 50;

    const coldColor = { r: 100 / 255, g: 150 / 255, b: 255 / 255 };
    const warmColor = { r: 255 / 255, g: 150 / 255, b: 100 / 255 };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      this.sizes[i] = PARTICLE_SIZE_MIN + humidityFactor * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
      this.opacities[i] = 0.25 + humidityFactor * 0.45;

      const t = tempNorm;
      const randomVariation = 0.85 + Math.random() * 0.15;
      this.colors[i3] = this.lerp(coldColor.r, warmColor.r, t) * randomVariation;
      this.colors[i3 + 1] = this.lerp(coldColor.g, warmColor.g, t) * randomVariation;
      this.colors[i3 + 2] = this.lerp(coldColor.b, warmColor.b, t) * randomVariation;
    }

    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.customColor.needsUpdate = true;
    this.geometry.attributes.customOpacity.needsUpdate = true;
  }

  /**
   * 线性插值
   * @param a - 起始值
   * @param b - 结束值
   * @param t - 插值因子 0~1
   * @returns 插值结果
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * 每帧更新云层状态
   * @param deltaTime - 距离上一帧的时间（秒）
   * @param elapsedTime - 自场景启动以来的总时间（秒）
   *
   * 主要功能:
   * 1. 快照过渡动画（如果正在进行中）
   * 2. Perlin噪声驱动的粒子流动动画
   * 3. 根据相机旋转计算视差偏移
   * 4. 近距离时云层透光效果
   * 5. 更新光晕脉冲动画
   *
   * 数据流向:
   * main.ts 动画循环每帧调用 update()
   * → 计算新的粒子位置/大小/颜色
   * → 写入 positions/sizes/colors 数组
   * → 标记 BufferGeometry 属性需要更新
   * → Three.js 下一帧渲染时使用新数据
   */
  update(deltaTime: number, elapsedTime: number): void {
    const time = elapsedTime * 0.15;

    if (this.transitionProgress < 1 && this.transitionFrom && this.transitionTo) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      this.transitionProgress = Math.min(this.transitionProgress, 1);

      const easeT = this.easeInOut(this.transitionProgress);

      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        this.positions[i] = this.transitionFrom[i] + (this.transitionTo[i] - this.transitionFrom[i]) * easeT;
      }

      if (this.transitionProgress >= 1) {
        this.transitionFrom = null;
        this.transitionTo = null;
      }
    } else {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const bx = this.basePositions[i3];
        const by = this.basePositions[i3 + 1];
        const bz = this.basePositions[i3 + 2];

        const noiseScale = 0.015;
        const nx = this.perlin.fbm(bx * noiseScale + time * 0.3, by * noiseScale, bz * noiseScale, 3);
        const ny = this.perlin.fbm(bx * noiseScale, by * noiseScale + time * 0.2, bz * noiseScale + 100, 3);
        const nz = this.perlin.fbm(bx * noiseScale + 200, by * noiseScale, bz * noiseScale + time * 0.3, 3);

        const displacement = 8;
        this.positions[i3] = bx + nx * displacement + this.windSpeed * elapsedTime * 0.5;
        this.positions[i3 + 1] = by + ny * displacement * 0.5;
        this.positions[i3 + 2] = bz + nz * displacement;

        this.basePositions[i3] += this.windSpeed * deltaTime * 0.5;
      }
    }

    const cameraAngle = Math.atan2(this.camera.position.x, this.camera.position.z);
    const angleDelta = cameraAngle - this.lastCameraRotation;
    this.lastCameraRotation = cameraAngle;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const depth = this.positions[i3 + 2] + CLOUD_SPREAD * 0.6;
      const depthFactor = depth / (CLOUD_SPREAD * 1.2);
      const parallaxAmount = angleDelta * depthFactor * 5;

      this.parallaxOffsets[i3] = -parallaxAmount;
      this.parallaxOffsets[i3 + 1] = 0;
      this.parallaxOffsets[i3 + 2] = 0;
    }

    const finalPositions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      finalPositions[i] = this.positions[i] + this.parallaxOffsets[i];
    }

    const camPos = this.camera.position;
    const cloudCenter = new THREE.Vector3(0, 5, 0);
    const camDist = camPos.distanceTo(cloudCenter);
    const closeFactor = Math.max(0, 1 - camDist / 60);

    if (closeFactor > 0.3) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const currentOpacity = 0.25 + (this.humidity / 100) * 0.45;
        const transparentFactor = (closeFactor - 0.3) / 0.7;
        this.opacities[i] = currentOpacity * (1 - transparentFactor * 0.5);
      }
      this.geometry.attributes.customOpacity.needsUpdate = true;
    } else {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        this.opacities[i] = 0.25 + (this.humidity / 100) * 0.45;
      }
      this.geometry.attributes.customOpacity.needsUpdate = true;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.updateHalos(deltaTime, elapsedTime);
  }

  /**
   * ease-in-out 缓动函数
   * @param t - 输入值 0~1
   * @returns 缓动后的值 0~1
   */
  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * 更新所有光晕脉冲动画
   * @param deltaTime - 距离上一帧的时间（秒）
   * @param elapsedTime - 总运行时间（秒）
   *
   * 每帧遍历所有活动光晕，更新缩放和透明度
   * 动画结束后自动清理
   */
  private updateHalos(deltaTime: number, elapsedTime: number): void {
    for (let i = this.halos.length - 1; i >= 0; i--) {
      const halo = this.halos[i];
      const age = elapsedTime - halo.startTime;
      const progress = age / halo.duration;

      if (progress >= 1) {
        this.scene.remove(halo.sprite);
        halo.sprite.material.dispose();
        this.halos.splice(i, 1);
        continue;
      }

      const scale = 1 + progress * 15;
      halo.sprite.scale.set(scale, scale, 1);
      (halo.sprite.material as THREE.SpriteMaterial).opacity = (1 - progress) * 0.8;
    }
  }

  /**
   * 获取 Points 对象
   * @returns Three.js Points 网格对象
   *
   * 供 main.ts 进行 Raycaster 点击检测
   */
  getPoints(): THREE.Points {
    return this.points;
  }

  /**
   * 获取粒子总数
   * @returns 粒子数量
   */
  getParticleCount(): number {
    return PARTICLE_COUNT;
  }

  /**
   * 获取指定粒子的世界坐标
   * @param index - 粒子索引
   * @returns 粒子的三维坐标
   *
   * 供 main.ts 显示悬浮标签坐标信息
   */
  getParticlePosition(index: number): THREE.Vector3 {
    const i3 = index * 3;
    return new THREE.Vector3(
      this.positions[i3],
      this.positions[i3 + 1],
      this.positions[i3 + 2]
    );
  }

  /**
   * 获取指定粒子周围的粒子密度
   * @param index - 粒子索引
   * @returns 半径15单位内的粒子数量
   *
   * 供 main.ts 显示悬浮标签密度信息
   */
  getParticleDensity(index: number): number {
    const pos = this.getParticlePosition(index);
    let count = 0;
    const radius = 15;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (i === index) continue;
      const i3 = i * 3;
      const dx = this.positions[i3] - pos.x;
      const dy = this.positions[i3 + 1] - pos.y;
      const dz = this.positions[i3 + 2] - pos.z;
      if (dx * dx + dy * dy + dz * dz < radius * radius) {
        count++;
      }
    }

    return count;
  }

  /**
   * 在指定粒子处创建光晕脉冲动画
   * @param particleIndex - 触发光晕的粒子索引
   * @param elapsedTime - 当前总时间（秒），用于计算动画进度
   *
   * 数据流向:
   * main.ts 检测到粒子点击 → 调用 createHaloPulse()
   * → 创建 CanvasTexture + SpriteMaterial + Sprite
   * → 添加到场景并加入 halos 数组
   * → update() 每帧更新光晕缩放和透明度
   * → 2秒后自动销毁
   */
  createHaloPulse(particleIndex: number, elapsedTime: number): void {
    const pos = this.getParticlePosition(particleIndex);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(64, 64, 40, 64, 64, 55);
    grad.addColorStop(0, 'rgba(100, 180, 255, 0)');
    grad.addColorStop(0.6, 'rgba(100, 180, 255, 0.05)');
    grad.addColorStop(1, 'rgba(100, 180, 255, 0.15)');
    ctx.fillStyle = grad;
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.8,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.set(1, 1, 1);
    this.scene.add(sprite);

    this.halos.push({
      sprite,
      startTime: elapsedTime,
      duration: 2,
    });
  }

  /**
   * 获取当前所有粒子的位置数组（深拷贝）
   * @returns 粒子位置的 Float32Array
   *
   * 供 main.ts 保存快照使用
   */
  getPositions(): Float32Array {
    return new Float32Array(this.positions);
  }

  /**
   * 获取当前所有粒子的基准位置数组（深拷贝）
   * @returns 粒子基准位置的 Float32Array
   *
   * 供 main.ts 保存快照使用
   */
  getBasePositions(): Float32Array {
    return new Float32Array(this.basePositions);
  }

  /**
   * 启动位置过渡动画
   * @param targetPositions - 目标位置数组
   *
   * 数据流向:
   * main.ts 恢复快照时调用 → startTransition()
   * → 保存起始和目标位置数组
   * → update() 每帧按 easeInOut 曲线插值
   * → 3秒后过渡完成
   */
  startTransition(targetPositions: Float32Array): void {
    this.transitionFrom = new Float32Array(this.positions);
    this.transitionTo = new Float32Array(targetPositions);
    this.transitionProgress = 0;
  }

  /**
   * 检查是否正在进行过渡动画
   * @returns 是否在过渡中
   */
  isTransitioning(): boolean {
    return this.transitionProgress < 1;
  }

  /**
   * 获取当前云层参数
   * @returns 包含风速、湿度、温度的对象
   *
   * 供 main.ts 保存快照使用
   */
  getCurrentParams(): { windSpeed: number; humidity: number; temperature: number } {
    return {
      windSpeed: this.windSpeed,
      humidity: this.humidity,
      temperature: this.temperature,
    };
  }

  /**
   * 生成 50x50 缩略图
   * @returns 缩略图的 dataURL
   *
   * 使用离屏Canvas绘制粒子云的正视图
   * 用于快照卡片的缩略图显示
   */
  generateThumbnail(): string {
    const thumbSize = 50;
    const canvas = document.createElement('canvas');
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, thumbSize, thumbSize);

    const centerX = thumbSize / 2;
    const centerY = thumbSize / 2;
    const scale = thumbSize / (CLOUD_SPREAD * 2);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const x = centerX + this.positions[i3] * scale;
      const y = centerY - this.positions[i3 + 1] * scale * 0.5;
      const r = Math.max(1, this.sizes[i] * scale * 0.5);

      const ri = Math.floor(this.colors[i3] * 255);
      const gi = Math.floor(this.colors[i3 + 1] * 255);
      const bi = Math.floor(this.colors[i3 + 2] * 255);
      const alpha = this.opacities[i] * 0.6;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, `rgba(${ri}, ${gi}, ${bi}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${ri}, ${gi}, ${bi}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * 释放所有资源
   * 销毁几何体、材质和所有光晕
   */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const halo of this.halos) {
      this.scene.remove(halo.sprite);
      halo.sprite.material.dispose();
    }
    this.halos = [];
  }
}
