export interface Vec2 {
  x: number;
  y: number;
}

export interface ParticleState {
  phase: 'flowing' | 'locked' | 'victory' | 'fading';
}

/**
 * 粒子物理参数配置
 * ============================================================
 * 参数来源与调优说明：
 *
 * 1. CENTRAL_FORCE (向心力系数):
 *    - 来源: 经验值，基于"中心吸引+边缘斥力"的流体模拟经验
 *    - 物理模型: 模拟弱引力场中的阻尼振荡系统
 *    - 调优建议:
 *      - 增大(>0.15): 粒子更快速汇聚到中心，混沌感降低
 *      - 减小(<0.03): 粒子扩散范围增大，可能飘出画布
 *      - 推荐范围: 0.05 ~ 0.12
 *
 * 2. REPEL_RADIUS (静电斥力半径):
 *    - 来源: 经验值，约为粒子平均间距的3-4倍
 *    - 物理模型: 模拟分子间范德华斥力 / 库仑斥力的短程作用
 *    - 与粒子密度关系: 粒子数越多，斥力半径应适当减小
 *    - 调优建议:
 *      - 增大(>35): 粒子间"蓬松"，难以压缩到沙漏中
 *      - 减小(<15): 粒子容易重叠，视觉效果差
 *      - 推荐范围: 20 ~ 30
 *
 * 3. REPEL_FORCE (静电斥力系数):
 *    - 来源: 经验值，与向心力配合形成稳定平衡
 *    - 物理模型: 采用平方反比衰减的近似 (overlap²)
 *    - 调优建议:
 *      - 增大(>2.0): 粒子集群难以被磁力拉拽
 *      - 减小(<0.6): 粒子容易粘连成块
 *      - 推荐范围: 0.8 ~ 1.5
 *
 * 4. MAG_RADIUS / MAX_PULL_SPEED (磁力参数):
 *    - 来源: 参考"鼠标交互体感"经验 - 50px半径约手指/光标感知舒适区
 *    - 物理模型: 二次方衰减的吸引力场，距离越近吸力越强
 *    - 调优建议:
 *      - 磁力过强: 粒子"粘"在鼠标上，难以精准塑形
 *      - 磁力过弱: 拖拽手感拖沓，反馈不及时
 *
 * 5. DAMPING (阻尼系数):
 *    - 来源: 经验值，模拟空气阻力/粘性介质
 *    - 物理模型: 每帧速度乘以阻尼，一阶线性阻尼
 *    - 调优建议:
 *      - 阻尼太大(>0.995): 系统能量积累，粒子速度可能失控
 *      - 阻尼太小(<0.95): 粒子运动很快停滞，缺乏流动感
 * ============================================================
 */
export const PHYSICS_CONFIG = {
  CENTRAL_FORCE: 0.08,
  REPEL_RADIUS: 25,
  REPEL_FORCE: 1.2,
  MAG_RADIUS: 50,
  MAX_PULL_SPEED: 80,
  DAMPING: 0.985,
  MAX_SPEED: 200,
  VICTORY_MAX_SPEED: 260,
  VICTORY_DAMPING: 0.98,
  VICTORY_FADE_RATE: 0.5,
  EDGE_MARGIN: 50,
  LOD_SKIP_FRAMES: 4,
  LOD_RADIUS_SCALE: 0.6,
  HOURGLASS_BOUNDARY_TOLERANCE: 2,
  BREATH_MIN_GLOW: 0.2,
  BREATH_MAX_GLOW: 0.5,
  GLOW_RADIUS_MULTIPLIER: 3,
  VICTORY_REMOVE_THRESHOLD: 0.5,
} as const;

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  baseColor: string;
  life: number;
  maxLife: number;
  opacity: number;
  locked: boolean;
  lockedX: number;
  lockedY: number;
  victoryVx: number;
  victoryVy: number;
  victoryColor: string;
  gridX: number;
  gridY: number;
  active: boolean;
  id: number;
  private static nextId = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const spread = Math.min(canvasWidth, canvasHeight) * 0.35;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread;

    this.x = cx + Math.cos(angle) * dist;
    this.y = cy + Math.sin(angle) * dist;

    const speed = 0.5 + Math.random() * 1.5;
    const velAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(velAngle) * speed;
    this.vy = Math.sin(velAngle) * speed;

    this.radius = 1 + Math.random() * 2;

    const t = Math.random();
    const r = Math.floor(0x4A + (0x7A - 0x4A) * t);
    const g = Math.floor(0x4A + (0x7A - 0x4A) * t);
    const b = Math.floor(0x4A + (0x7A - 0x4A) * t);
    this.baseColor = `rgb(${r},${g},${b})`;
    this.color = this.baseColor;

    this.life = 1;
    this.maxLife = 1;
    this.opacity = 1;
    this.locked = false;
    this.lockedX = 0;
    this.lockedY = 0;
    this.victoryVx = 0;
    this.victoryVy = 0;
    this.victoryColor = '#FFD700';
    this.gridX = 0;
    this.gridY = 0;
    this.active = true;
    this.id = Particle.nextId++;
  }

  /**
   * 检测粒子是否在沙漏区域内
   *
   * 实现方案：
   * 沙漏由两个倒置的等边三角形组成：
   *   - 上三角形：尖端朝下，底边在上
   *   - 下三角形：尖端朝上，底边在下
   *   - 两三角形尖端间距 = gap
   *
   * 边界容差处理 (HOURGLASS_BOUNDARY_TOLERANCE = 2px)：
   *   - 所有边界判定向外扩展 2px 容差
   *   - 目的：消除浮点精度导致的边界闪烁问题
   *   - 粒子穿过边界时计数平滑过渡，不会跳变
   *
   * 重叠区域处理逻辑：
   *   - 上下三角形的尖端区域（gap附近）存在微小重叠带
   *   - 由于使用 || 逻辑，粒子只要在任意一个三角形内就计数
   *   - 不会重复计数（一个粒子只算一次）
   *   - 重叠带中的粒子归属：先匹配上三角还是下三角不影响总计数
   *
   * 伪代码:
   *   pointInTriangle(p, tri):
   *     // 对三角形三条边分别做点在边内侧检测
   *     // 带容差: 每条边的判定向外扩展 tolerance
   *     return (side1_test && side2_test && side3_test)
   *
   *   isInHourglass(p):
   *     inTop = pointInTriangle(p, topTriangle)
   *     inBottom = pointInTriangle(p, bottomTriangle)
   *     return inTop || inBottom   // 单粒子单次计数，无重复
   *
   * @param cx 画布中心X
   * @param cy 画布中心Y
   * @param side 三角形边长
   * @param gap 上下尖角间距
   * @returns 粒子是否在沙漏区域内
   */
  isInHourglass(cx: number, cy: number, side: number, gap: number): boolean {
    const tol = PHYSICS_CONFIG.HOURGLASS_BOUNDARY_TOLERANCE;
    const halfSide = side / 2;
    const halfGap = gap / 2;
    const localX = this.x - cx;
    const localY = this.y - cy;

    const topY = -halfGap;
    const topLeftX = -halfSide;
    const topRightX = halfSide;

    const topInTriangle =
      localY <= topY + tol &&
      localY >= topY - halfSide - tol &&
      localX >= topLeftX * (1 + (localY - topY) / halfSide) - tol &&
      localX <= topRightX * (1 + (localY - topY) / halfSide) + tol;

    if (topInTriangle) return true;

    const bottomY = halfGap;
    const bottomLeftX = -halfSide;
    const bottomRightX = halfSide;

    const bottomInTriangle =
      localY >= bottomY - tol &&
      localY <= bottomY + halfSide + tol &&
      localX >= bottomLeftX * (1 - (localY - bottomY) / halfSide) - tol &&
      localX <= bottomRightX * (1 - (localY - bottomY) / halfSide) + tol;

    return bottomInTriangle;
  }

  /**
   * 应用所有物理力
   *
   * 力的叠加顺序（按优先级）:
   *   1. 中心吸引力 (向心力，全局场)
   *   2. 粒子间斥力 (短程力，空间哈希优化)
   *   3. 鼠标磁力 (交互力，临时场)
   *   4. 阻尼 (能量耗散)
   *   5. 速度上限 (安全钳制)
   *
   * 空间哈希优化:
   *   - 格点大小 = REPEL_RADIUS
   *   - 每个粒子只与相邻3x3格点内的粒子做斥力计算
   *   - 复杂度从 O(n²) 降至 O(n)
   *
   * @param particles 所有粒子数组
   * @param grid 空间哈希网格
   * @param gridCellSize 网格单元大小
   * @param cx 中心X
   * @param cy 中心Y
   * @param mouseActive 鼠标是否按下
   * @param mouseX 鼠标X
   * @param mouseY 鼠标Y
   * @param deltaTime 帧时间差(秒)
   * @param state 粒子系统状态
   */
  applyForces(
    particles: Particle[],
    grid: Map<string, Particle[]>,
    gridCellSize: number,
    cx: number,
    cy: number,
    mouseActive: boolean,
    mouseX: number,
    mouseY: number,
    deltaTime: number,
    state: ParticleState
  ) {
    if (!this.active) return;

    if (state.phase === 'locked' || this.locked) {
      this.x = this.lockedX;
      this.y = this.lockedY;
      return;
    }

    if (state.phase === 'victory') {
      this.applyVictoryMotion(deltaTime);
      return;
    }

    if (state.phase === 'fading') {
      this.applyFadingMotion(deltaTime);
      return;
    }

    const dt = deltaTime;

    const centerDx = cx - this.x;
    const centerDy = cy - this.y;
    const centerDist = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
    if (centerDist > 0.001) {
      const centerForce = PHYSICS_CONFIG.CENTRAL_FORCE;
      this.vx += (centerDx / centerDist) * centerForce * dt;
      this.vy += (centerDy / centerDist) * centerForce * dt;
    }

    const repelRadius = PHYSICS_CONFIG.REPEL_RADIUS;
    const repelForce = PHYSICS_CONFIG.REPEL_FORCE;

    const gx = Math.floor(this.x / gridCellSize);
    const gy = Math.floor(this.y / gridCellSize);

    for (let ogx = gx - 1; ogx <= gx + 1; ogx++) {
      for (let ogy = gy - 1; ogy <= gy + 1; ogy++) {
        const key = `${ogx},${ogy}`;
        const cell = grid.get(key);
        if (!cell) continue;

        for (let i = 0; i < cell.length; i++) {
          const other = cell[i];
          if (other === this || !other.active) continue;

          const dx = this.x - other.x;
          const dy = this.y - other.y;
          const distSq = dx * dx + dy * dy;

          if (distSq > 0.01 && distSq < repelRadius * repelRadius) {
            const dist = Math.sqrt(distSq);
            const overlap = (repelRadius - dist) / repelRadius;
            const force = overlap * overlap * repelForce;
            this.vx += (dx / dist) * force * dt;
            this.vy += (dy / dist) * force * dt;
          }
        }
      }
    }

    if (mouseActive) {
      const mx = mouseX;
      const my = mouseY;
      const mdx = mx - this.x;
      const mdy = my - this.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      const magRadius = PHYSICS_CONFIG.MAG_RADIUS;

      if (mDist < magRadius && mDist > 0.001) {
        const strength = 1 - mDist / magRadius;
        const pull = strength * strength * PHYSICS_CONFIG.MAX_PULL_SPEED;
        this.vx += (mdx / mDist) * pull * dt;
        this.vy += (mdy / mDist) * pull * dt;
      }
    }

    this.vx *= PHYSICS_CONFIG.DAMPING;
    this.vy *= PHYSICS_CONFIG.DAMPING;

    const maxSpeed = PHYSICS_CONFIG.MAX_SPEED;
    const speedSq = this.vx * this.vx + this.vy * this.vy;
    if (speedSq > maxSpeed * maxSpeed) {
      const speed = Math.sqrt(speedSq);
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * 胜利爆炸运动更新
   *
   * 衰减类型说明:
   *   - 指数衰减 (multiplicative damping): v *= damping 每帧
   *   - 特点: 速度永远不会真正到零，而是渐近趋近于零
   *   - 优势: 运动自然，开始快后期慢，符合物理直觉
   *
   * 移除逻辑:
   *   - 当速度低于 VICTORY_REMOVE_THRESHOLD (0.5 px/s) 时
   *   - 标记 active = false，从渲染和物理更新中排除
   *   - 目的: 避免大量几乎静止的粒子占用计算资源
   *
   * 透明度衰减:
   *   - 线性衰减: opacity -= deltaTime * fadeRate
   *   - 2秒内完全消散
   *
   * 最大速度限制:
   *   - 防止初始速度过大导致粒子瞬间飞出画布看不见
   *   - VICTORY_MAX_SPEED = 260 px/s
   *
   * 伪代码:
   *   updateVictoryParticle(p, dt):
   *     p.x += p.victoryVx * dt
   *     p.y += p.victoryVy * dt
   *     p.victoryVx *= DAMPING        // 指数衰减
   *     p.victoryVy *= DAMPING
   *     clamp_speed(p, MAX_SPEED)     // 安全限速
   *     p.opacity -= FADE_RATE * dt   // 线性淡出
   *     if speed < REMOVE_THRESHOLD or opacity < 0:
   *       p.active = false            // 移除
   *
   * @param deltaTime 帧时间差(秒)
   */
  private applyVictoryMotion(deltaTime: number) {
    this.x += this.victoryVx * deltaTime;
    this.y += this.victoryVy * deltaTime;

    this.victoryVx *= PHYSICS_CONFIG.VICTORY_DAMPING;
    this.victoryVy *= PHYSICS_CONFIG.VICTORY_DAMPING;

    const vSpeedSq = this.victoryVx * this.victoryVx + this.victoryVy * this.victoryVy;
    const maxVs = PHYSICS_CONFIG.VICTORY_MAX_SPEED;
    if (vSpeedSq > maxVs * maxVs) {
      const vSpeed = Math.sqrt(vSpeedSq);
      this.victoryVx = (this.victoryVx / vSpeed) * maxVs;
      this.victoryVy = (this.victoryVy / vSpeed) * maxVs;
    }

    this.opacity = Math.max(0, this.opacity - deltaTime * PHYSICS_CONFIG.VICTORY_FADE_RATE);
    this.color = this.victoryColor;

    const removeThreshold = PHYSICS_CONFIG.VICTORY_REMOVE_THRESHOLD;
    if (vSpeedSq < removeThreshold * removeThreshold || this.opacity <= 0.001) {
      this.active = false;
    }
  }

  /**
   * 失败消散运动
   * 粒子缓慢漂移并线性淡出
   */
  private applyFadingMotion(deltaTime: number) {
    this.opacity = Math.max(0, this.opacity - deltaTime / 3);
    this.x += this.vx * deltaTime * 0.3;
    this.y += this.vy * deltaTime * 0.3;

    if (this.opacity <= 0.001) {
      this.active = false;
    }
  }

  lockPosition() {
    this.locked = true;
    this.lockedX = this.x;
    this.lockedY = this.y;
  }

  triggerVictoryBurst(canvasWidth: number, canvasHeight: number) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const dx = this.x - cx;
    const dy = this.y - cy;
    let angle: number;

    if (dx === 0 && dy === 0) {
      angle = Math.random() * Math.PI * 2;
    } else {
      const baseAngle = Math.atan2(dy, dx);
      angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.4;
    }

    const speed = 80 + Math.random() * 180;
    const maxSpeed = PHYSICS_CONFIG.VICTORY_MAX_SPEED;
    const clampedSpeed = Math.min(speed, maxSpeed);

    this.victoryVx = Math.cos(angle) * clampedSpeed;
    this.victoryVy = Math.sin(angle) * clampedSpeed;
    this.opacity = 1;
    this.color = this.victoryColor;
    this.active = true;
  }

  /**
   * 粒子渲染
   *
   * LOD (Level of Detail) 实现方案：
   * ==================================
   * 距离阈值: EDGE_MARGIN = 50px
   *   - 距画布边缘 50px 以内的粒子判定为"边缘粒子"
   *
   * 两级 LOD:
   *   Level 0 (正常): 完整渲染
   *     - 绘制呼吸光晕 (径向渐变)
   *     - 绘制粒子本体 (完整半径)
   *     - 每帧都渲染
   *
   *   Level 1 (低精度): 边缘粒子
   *     - 跳帧渲染: 每 4 帧渲染一次 (LOD_SKIP_FRAMES=4)
   *     - 无光晕: 跳过径向渐变绘制，节省 fillStyle 切换开销
   *     - 缩小半径: 半径 × 0.6 (LOD_RADIUS_SCALE=0.6)
   *
   * 粒子大小对距离阈值的影响：
   *   - 当前实现: 使用固定阈值 50px
   *   - 设计考量:
   *     * 大粒子(r=3)比小粒子(r=1)视觉权重高
   *     * 如果阈值随粒子大小动态调整，边缘会出现"大小粒子切换不同步"
   *     * 固定阈值虽然简单，但所有粒子在同一距离处降级，视觉过渡更统一
   *   - 改进方向: 如需要更精细控制，可引入:
   *     edgeMargin = EDGE_MARGIN + this.radius * 3
   *     (让大粒子更早进入LOD，但变化更平缓)
   *
   * 视觉突变防止:
   *   - 因为跳帧渲染 + 半径缩小同时进行，粒子到边缘时会"变暗变小"
   *   - 这是渐进式变化，不是突然消失，视觉可接受
   *   - 边缘粒子本来就有背景渐晕遮蔽 (vignette)，变化不明显
   *
   * 伪代码:
   *   renderParticle(p):
   *     nearEdge = p.x < 50 || p.x > W-50 || p.y < 50 || p.y > H-50
   *
   *     if nearEdge:
   *       if frame % 4 != 0: return   // 跳帧
   *       radius = p.radius * 0.6       // 缩小
   *       drawGlow = false              // 无光晕
   *     else:
   *       radius = p.radius             // 原大小
   *       drawGlow = true               // 有光晕
   *
   *     if drawGlow: drawRadialGlow(p, radius)
   *     drawCircle(p, radius)
   *
   * 性能收益估算:
   *   - 边缘粒子占比约 20-30%（取决于画布大小和粒子分布）
   *   - 单粒子渲染开销减少约 60%（光晕绘制是主要开销）
   *   - 总渲染性能提升约 12-18%
   *
   * @param ctx 画布上下文
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @param breathIntensity 呼吸强度 0~1
   * @param frameCount 当前帧号（用于跳帧判断）
   * @param state 粒子系统状态
   */
  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    breathIntensity: number,
    frameCount: number,
    state: ParticleState
  ) {
    if (!this.active || this.opacity <= 0.01) return;

    const edgeMargin = PHYSICS_CONFIG.EDGE_MARGIN;
    const nearEdge =
      this.x < edgeMargin ||
      this.x > canvasWidth - edgeMargin ||
      this.y < edgeMargin ||
      this.y > canvasHeight - edgeMargin;

    if (nearEdge && frameCount % PHYSICS_CONFIG.LOD_SKIP_FRAMES !== 0 && state.phase === 'flowing') {
      return;
    }

    ctx.globalAlpha = this.opacity;

    const useLOD = nearEdge && state.phase === 'flowing';
    const renderRadius = useLOD ? this.radius * PHYSICS_CONFIG.LOD_RADIUS_SCALE : this.radius;

    if (state.phase === 'flowing' && !useLOD) {
      const glowMin = PHYSICS_CONFIG.BREATH_MIN_GLOW;
      const glowMax = PHYSICS_CONFIG.BREATH_MAX_GLOW;
      const glowMult = PHYSICS_CONFIG.GLOW_RADIUS_MULTIPLIER;
      const glowIntensity = glowMin + breathIntensity * (glowMax - glowMin);
      const glowRadius = renderRadius * glowMult * glowIntensity;

      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowRadius
      );
      gradient.addColorStop(0, this.baseColor);
      gradient.addColorStop(1, 'rgba(122,122,122,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, renderRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

/**
 * 空间哈希网格 (Spatial Hash Grid)
 *
 * 用途: 优化粒子间近邻查询效率
 *
 * 原理:
 *   - 将画布划分为 cellSize × cellSize 的网格
 *   - 每个粒子存入对应网格单元
 *   - 查询邻居时只遍历相邻 3×3 = 9 个单元
 *
 * 复杂度:
 *   - 插入: O(1)
 *   - 近邻查询: O(k)，k 为附近粒子数，远小于 n
 *   - 整体斥力计算: O(n)（均匀分布下）
 *
 * 格点大小选择原则:
 *   - 应等于或略大于相互作用半径 (REPEL_RADIUS = 25)
 *   - 太小: 粒子可能跨越多格，查询开销增加
 *   - 太大: 每格粒子太多，退化为 O(n²)
 *   - 当前 cellSize = 25，与斥力半径相等，最优
 */
export class SpatialHashGrid {
  cellSize: number;
  cells: Map<string, Particle[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  insert(particle: Particle) {
    if (!particle.active) return;
    const gx = Math.floor(particle.x / this.cellSize);
    const gy = Math.floor(particle.y / this.cellSize);
    particle.gridX = gx;
    particle.gridY = gy;
    const key = `${gx},${gy}`;
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(particle);
  }

  getGrid() {
    return this.cells;
  }
}

export const PARTICLE_DEBUG = {
  logPhysicsOnce: false,
  logHourglassDetectionOnce: false,
} as const;
