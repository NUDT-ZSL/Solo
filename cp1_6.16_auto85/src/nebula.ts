import * as THREE from 'three';
import type { ControlParams } from './controls';

const PARTICLE_COUNT = 2000;
const STAR_COUNT = 500;
const NEBULA_RADIUS = 8;
const MAX_BOUNDARY = NEBULA_RADIUS * 1.2;

/**
 * 星云粒子系统类
 * 负责创建和管理2000个粒子的螺旋星云，支持颜色渐变、径向漂移、自转等动态效果
 * 所有参数可通过外部控制面板实时调节，变化均采用平滑过渡动画
 */
export class NebulaSystem {
  public nebulaGroup: THREE.Group;
  public starsPoints: THREE.Points;

  private particlesGeometry!: THREE.BufferGeometry;
  private particlesMaterial!: THREE.PointsMaterial;
  private particlesPoints!: THREE.Points;

  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private distances!: Float32Array;
  private initialPositions!: Float32Array;

  // ==================== 颜色过渡相关变量 ====================
  // 颜色过渡目标值（用户设置的新颜色）
  private targetColorStart = new THREE.Color('#4A90D9');
  private targetColorEnd = new THREE.Color('#9B59B6');
  // 颜色过渡当前值（每帧更新的中间色）
  private currentColorStart = new THREE.Color('#4A90D9');
  private currentColorEnd = new THREE.Color('#9B59B6');
  // 颜色过渡起始值（过渡开始瞬间的颜色快照）
  private startColorStart = new THREE.Color('#4A90D9');
  private startColorEnd = new THREE.Color('#9B59B6');
  // 颜色过渡进度（0~1），每帧根据deltaTime累加
  // 当colorTransitionProgress >= 1时表示过渡完成，停止颜色计算
  private colorTransitionProgress = 1;
  // 颜色过渡总时长（秒）
  private readonly COLOR_TRANSITION_DURATION = 0.5;

  // ==================== 粒子运动相关变量 ====================
  // 当前粒子径向漂移速度（单位/帧），由滑块直接控制
  private currentSpeed = 0.001;

  // ==================== 自转过渡相关变量 ====================
  // 当前自转速度（弧度/帧），每帧根据过渡进度插值更新
  private rotationSpeed = 0.0005;
  // 自转目标速度（用户选择的模式对应的速度）
  private targetRotationSpeed = 0.0005;
  // 自转过渡起始速度（模式切换瞬间的速度快照）
  private startRotationSpeed = 0.0005;
  // 自转过渡进度（0~1），每帧根据deltaTime累加
  private rotationTransitionProgress = 1;
  // 自转过渡总时长（秒）
  private readonly ROTATION_TRANSITION_DURATION = 0.3;

  // 粒子基础大小乘数
  private baseParticleSize = 0.05;

  // 临时颜色对象，避免每帧new新对象造成GC开销
  private tempColor = new THREE.Color();

  constructor() {
    this.nebulaGroup = new THREE.Group();
    this.starsPoints = this.createBackgroundStars();
    this.createNebulaParticles();
    this.nebulaGroup.add(this.particlesPoints);
  }

  /**
   * 创建背景星空（500个静态白点）
   * 分布在半径50单位的球体内，均匀分布
   * 不受UI控制，仅作为场景背景装饰
   */
  private createBackgroundStars(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      // 使用 Math.random() * 50 实现0~50单位球体内均匀分布
      // 球坐标转换：theta为方位角(0~2π)，phi为极角(0~π)
      const radius = Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.01,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * 创建星云主体粒子（2000个彩色粒子）
   * 分布特点：
   *  - 扁平螺旋结构（类似银河系）
   *  - 使用平方根分布实现密度从中心向外递减
   *  - 4条旋臂结构
   *  - 垂直方向厚度随半径增大而变薄
   */
  private createNebulaParticles(): void {
    this.particlesGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.distances = new Float32Array(PARTICLE_COUNT);
    this.initialPositions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 4条旋臂，粒子按索引均匀分配到各旋臂
      const armOffset = (i % 4) * (Math.PI / 2);

      // 使用平方根分布实现粒子密度从中心向外递减
      // Math.sqrt(Math.random()) 使小半径值的概率更高
      // 概率密度函数 f(r) = 2r，面积均匀分布的等效半径
      const densityFactor = Math.sqrt(Math.random());
      const radius = densityFactor * NEBULA_RADIUS;

      // 螺旋角 = 旋臂起始角 + 半径决定的缠绕度 + 随机扰动
      // 半径越大，缠绕角度越多，形成螺旋效果
      const spiralAngle = armOffset + radius * 0.6 + (Math.random() - 0.5) * 0.4;

      // 高度方向（Y轴）：中心厚、外围薄
      // 使用高斯衰减函数 exp(-r²/(2σ²)) 模拟星系盘厚度
      const heightNoise = (Math.random() - 0.5) * 0.5;
      const heightFactor = Math.exp(-radius * radius / (NEBULA_RADIUS * NEBULA_RADIUS * 0.5));

      // 计算粒子X-Z平面位置，加径向随机扰动使旋臂更自然
      const x = radius * Math.cos(spiralAngle) + (Math.random() - 0.5) * 0.4 * (1 - densityFactor * 0.5);
      const y = heightNoise * heightFactor * 1.2;
      const z = radius * Math.sin(spiralAngle) + (Math.random() - 0.5) * 0.4 * (1 - densityFactor * 0.5);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      // 保存初始位置（当前未使用，但预留用于重置或特效）
      this.initialPositions[i3] = x;
      this.initialPositions[i3 + 1] = y;
      this.initialPositions[i3 + 2] = z;

      // 归一化距离（0~1），用于颜色插值
      this.distances[i] = radius / NEBULA_RADIUS;

      // 粒子大小随机分布在 0.02~0.08 之间
      this.sizes[i] = 0.02 + Math.random() * 0.06;
    }

    // 初始化粒子颜色
    this.updateParticleColors();

    // 将数据绑定到BufferGeometry
    this.particlesGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particlesGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particlesGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // PointsMaterial配置：
    //  - vertexColors: true 使用顶点颜色（每个粒子独立颜色）
    //  - sizeAttenuation: true 粒子大小随距离衰减（近大远小）
    //  - AdditiveBlending 加法混合，粒子重叠处更亮，模拟发光效果
    //  - depthWrite: false 避免透明粒子遮挡排序问题
    this.particlesMaterial = new THREE.PointsMaterial({
      size: this.baseParticleSize,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particlesPoints = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
  }

  /**
   * 根据距离插值更新所有粒子的颜色
   * 每个粒子颜色 = currentColorStart lerp currentColorEnd @ distance
   * 距离越近越接近起始色，越远越接近结束色
   */
  private updateParticleColors(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const t = this.distances[i];

      // 使用THREE.Color.lerp()在起始色和结束色之间线性插值
      this.tempColor.copy(this.currentColorStart).lerp(this.currentColorEnd, t);

      this.colors[i3] = this.tempColor.r;
      this.colors[i3 + 1] = this.tempColor.g;
      this.colors[i3 + 2] = this.tempColor.b;
    }
  }

  /**
   * 设置粒子大小（立即生效）
   * @param size 粒子大小基数
   */
  public setParticleSize(size: number): void {
    this.baseParticleSize = size;
    this.particlesMaterial.size = size;
  }

  /**
   * 设置粒子运动速度（立即生效）
   * @param speed 径向漂移速度
   */
  public setSpeed(speed: number): void {
    this.currentSpeed = speed;
  }

  /**
   * 设置星云渐变颜色（0.5秒平滑过渡）
   * 实现原理：
   *  1. 快照当前颜色作为过渡起始色
   *  2. 设置目标颜色
   *  3. 将过渡进度重置为0，由update函数逐帧推进
   * @param colorStart 起始颜色（中心色）
   * @param colorEnd 结束颜色（外围色）
   */
  public setColors(colorStart: string, colorEnd: string): void {
    // 保存当前颜色作为过渡的起始点，保证从当前状态平滑过渡
    this.startColorStart.copy(this.currentColorStart);
    this.startColorEnd.copy(this.currentColorEnd);

    // 设置目标颜色
    this.targetColorStart.set(colorStart);
    this.targetColorEnd.set(colorEnd);

    // 重置过渡进度为0，触发动画
    this.colorTransitionProgress = 0;
  }

  /**
   * 设置旋转模式（0.3秒ease-out平滑过渡）
   * 实现原理：
   *  1. 快照当前自转速度作为过渡起始速度
   *  2. 根据模式设置目标自转速度
   *  3. 将过渡进度重置为0，由update函数逐帧推进
   * @param mode 旋转模式：none/slow/fast
   */
  public setRotationMode(mode: ControlParams['rotationMode']): void {
    // 保存当前速度作为过渡的起始点，保证从当前速度平滑过渡
    this.startRotationSpeed = this.rotationSpeed;

    switch (mode) {
      case 'none':
        this.targetRotationSpeed = 0;
        break;
      case 'slow':
        this.targetRotationSpeed = 0.0005;
        break;
      case 'fast':
        this.targetRotationSpeed = 0.002;
        break;
    }

    // 重置过渡进度为0，触发动画
    this.rotationTransitionProgress = 0;
  }

  /**
   * 每帧更新函数
   * 处理：颜色过渡、自转过渡、粒子径向漂移、边界重置
   * @param deltaTime 上一帧到当前帧的时间差（秒）
   */
  public update(deltaTime: number): void {
    // ==================== 颜色过渡更新 ====================
    // 仅当进度<1时执行颜色插值计算，节省性能
    if (this.colorTransitionProgress < 1) {
      // 进度累加：deltaTime / 总时长，实现基于时间的匀速过渡
      // 例如deltaTime=0.016(60fps)，总时长0.5秒，则约30帧完成过渡
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + deltaTime / this.COLOR_TRANSITION_DURATION);

      // 应用ease-out cubic缓动函数，使过渡动画更自然
      // ease-out：开始快，结束慢，符合物理直觉
      const easeT = this.easeOutCubic(this.colorTransitionProgress);

      // 在起始色和目标色之间按缓动进度插值
      // lerpColors(a, b, t) = a + (b - a) * t
      this.currentColorStart.lerpColors(this.startColorStart, this.targetColorStart, easeT);
      this.currentColorEnd.lerpColors(this.startColorEnd, this.targetColorEnd, easeT);

      // 根据新的渐变颜色更新所有粒子颜色
      this.updateParticleColors();
      // 标记颜色属性需要更新到GPU
      (this.particlesGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    // ==================== 自转速度过渡更新 ====================
    if (this.rotationTransitionProgress < 1) {
      // 进度累加：deltaTime / 总时长
      this.rotationTransitionProgress = Math.min(1, this.rotationTransitionProgress + deltaTime / this.ROTATION_TRANSITION_DURATION);

      // 应用ease-out cubic缓动函数
      const easeT = this.easeOutCubic(this.rotationTransitionProgress);

      // 在起始速度和目标速度之间线性插值
      // v = v_start + (v_target - v_start) * easeT
      this.rotationSpeed = this.startRotationSpeed + (this.targetRotationSpeed - this.startRotationSpeed) * easeT;
    }

    // ==================== 星云整体自转 ====================
    this.nebulaGroup.rotation.y += this.rotationSpeed;

    // ==================== 粒子径向漂移运动 ====================
    const speed = this.currentSpeed;
    const positionAttr = this.particlesGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const x = this.positions[i3];
      const z = this.positions[i3 + 2];

      // 计算粒子到中心的距离（XZ平面）
      const dist = Math.sqrt(x * x + z * z);
      const normalizedDist = dist / NEBULA_RADIUS;

      // 越界重置：粒子漂移到最大边界后，重新在中心附近随机生成
      if (dist > MAX_BOUNDARY) {
        const resetRadius = Math.random() * 0.5;
        const angle = Math.random() * Math.PI * 2;
        this.positions[i3] = resetRadius * Math.cos(angle);
        this.positions[i3 + 2] = resetRadius * Math.sin(angle);
      } else {
        // 漂移速度随距离增大而增大（模拟星系旋转曲线的近似）
        const driftFactor = 0.5 + normalizedDist * 0.5;
        const driftSpeed = speed * driftFactor;

        // 沿径向向外移动（单位向量 * 速度）
        if (dist > 0.001) {
          this.positions[i3] += (x / dist) * driftSpeed;
          this.positions[i3 + 2] += (z / dist) * driftSpeed;
        }

        // 附加角速度：内圈快、外圈慢（类似刚体旋转的反向）
        // 让粒子在径向漂移的同时也有切向运动，更有星系感
        const angularSpeed = 0.0003 * (1 - normalizedDist * 0.7);
        const cosA = Math.cos(angularSpeed);
        const sinA = Math.sin(angularSpeed);
        const newX = x * cosA - z * sinA;
        const newZ = x * sinA + z * cosA;
        this.positions[i3] = newX;
        this.positions[i3 + 2] = newZ;

        // 垂直方向微小呼吸运动，增加生动感
        this.positions[i3 + 1] += Math.sin(Date.now() * 0.001 + i * 0.1) * 0.0001;
        this.positions[i3 + 1] = Math.max(-1.5, Math.min(1.5, this.positions[i3 + 1]));
      }
    }

    // 标记位置属性需要更新到GPU
    positionAttr.needsUpdate = true;
  }

  /**
   * ease-out cubic缓动函数
   * 公式：f(t) = 1 - (1-t)³
   * 特点：开始变化快，接近结束时逐渐变慢，模拟自然减速效果
   * @param t 线性进度（0~1）
   * @returns 缓动后的进度（0~1）
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 资源释放
   */
  public dispose(): void {
    this.particlesGeometry.dispose();
    this.particlesMaterial.dispose();
    (this.starsPoints.geometry as THREE.BufferGeometry).dispose();
    (this.starsPoints.material as THREE.Material).dispose();
  }
}
