/**
 * ============================================================
 *  timeManager.ts - 时间管理模块
 * ============================================================
 *
 * 【职责】
 *    管理模拟时间循环（6:00-20:00），基于天文模型计算太阳方位角和高度角，
 *    并通过发布-订阅模式通知所有订阅者（main.ts）时间和太阳位置更新。
 *
 * 【被调用关系】
 *    main.ts          → timeManager.start()              启动时间循环
 *    main.ts          → timeManager.subscribe(callback)  注册时间更新回调
 *    main.ts          → timeManager.stop()               停止时间循环
 *    guiController.ts → timeManager.setManualTime(time)  GUI手动设置时间
 *    guiController.ts → timeManager.resumeAutoPlay()     GUI恢复自动播放
 *    guiController.ts → timeManager.getCurrentTime()     GUI获取当前时间
 *    guiController.ts → timeManager.isPlaying()          GUI获取播放状态
 *
 * 【数据输出（通过subscribe回调）】
 *    → time: number              当前时间（小时制，如 6.5 = 06:30）
 *    → sunPosition: {
 *        azimuth: number,        太阳方位角（度）: -90°(东) ~ 0°(南) ~ +90°(西)
 *        altitude: number        太阳高度角（度）: 0°(地平线) ~ 90°(天顶) ~ 0°
 *      }
 *
 * 【太阳运动模型】
 *    时间范围：6:00(日出) → 13:00(正午) → 20:00(日落)，共14小时
 *
 *    方位角 azimuth：线性对称分布
 *      - 6:00  日出 → azimuth = -90° (正东方)
 *      - 9:30  上午 → azimuth = -45° (东南方)
 *      - 13:00 正午 → azimuth = 0°   (正南方，阴影指向正北)
 *      - 16:30 下午 → azimuth = +45° (西南方)
 *      - 20:00 日落 → azimuth = +90° (正西方)
 *
 *    高度角 altitude：正弦曲线，正午最高(90°)，上午下午完全对称
 *      - 6:00, 20:00 → altitude = 0°  (地平线)
 *      - 9:30, 16:30 → altitude = 45°
 *      - 13:00       → altitude = 90° (天顶)
 *
 *    关键帧间隔：每15分钟一个时间步长，过渡动画0.3秒缓动插值
 * ============================================================
 */

export interface SunPosition {
  azimuth: number
  altitude: number
}

export type TimeUpdateCallback = (time: number, sunPosition: SunPosition) => void

/** 时间循环参数常量 */
const START_HOUR: number = 6
const END_HOUR: number = 20
const TOTAL_HOURS: number = END_HOUR - START_HOUR
const STEP_MINUTES: number = 15
const UPDATE_INTERVAL: number = 200
const TRANSITION_DURATION: number = 300

/**
 * 方位角范围常量：
 * -90°(东) → 0°(南) → +90°(西)，总计180度
 */
const AZIMUTH_MIN: number = -90
const AZIMUTH_MAX: number = 90
const AZIMUTH_RANGE: number = AZIMUTH_MAX - AZIMUTH_MIN

class TimeManager {
  private currentTime: number
  private subscribers: Set<TimeUpdateCallback>
  private animationFrameId: number | null
  private lastUpdateTime: number
  private isAutoPlaying: boolean
  private isTransitioning: boolean

  private transitionStartTime: number
  private transitionFromTime: number
  private transitionToTime: number
  private transitionFromSun: SunPosition
  private transitionToSun: SunPosition

  private currentSunPosition: SunPosition

  constructor() {
    this.currentTime = START_HOUR
    this.subscribers = new Set()
    this.animationFrameId = null
    this.lastUpdateTime = 0
    this.isAutoPlaying = true
    this.isTransitioning = false

    this.transitionStartTime = 0
    this.transitionFromTime = START_HOUR
    this.transitionToTime = START_HOUR
    this.currentSunPosition = this.calculateSunPosition(START_HOUR)
    this.transitionFromSun = { ...this.currentSunPosition }
    this.transitionToSun = { ...this.currentSunPosition }
  }

  /**
   * 启动时间循环
   * 【调用方】main.ts
   */
  start(): void {
    this.lastUpdateTime = performance.now()
    this.loop()
  }

  /**
   * 停止时间循环
   * 【调用方】main.ts (销毁时)
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 注册时间更新回调（发布-订阅模式）
   *
   * 【调用方】main.ts → 用于触发阴影更新和UI刷新
   * 【调用方】guiController.ts → 用于同步GUI滑块位置
   *
   * @param callback 时间变化时触发的回调函数
   * @returns 取消订阅函数
   */
  subscribe(callback: TimeUpdateCallback): () => void {
    this.subscribers.add(callback)
    callback(this.currentTime, { ...this.currentSunPosition })
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * 手动设置时间（从GUI滑块调用）
   * 调用后会自动暂停自动循环
   *
   * 【调用方】guiController.ts → 用户拖动时间滑块
   * @param time 目标时间（小时制，6.0~20.0）
   */
  setManualTime(time: number): void {
    this.isAutoPlaying = false
    const clampedTime = Math.max(START_HOUR, Math.min(END_HOUR, time))
    this.beginTransition(this.currentTime, clampedTime)
  }

  /**
   * 恢复自动播放循环
   * 【调用方】guiController.ts → 用户点击自动播放开关
   */
  resumeAutoPlay(): void {
    if (!this.isAutoPlaying) {
      this.isAutoPlaying = true
      this.lastUpdateTime = performance.now()
    }
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  getSunPosition(): SunPosition {
    return { ...this.currentSunPosition }
  }

  isPlaying(): boolean {
    return this.isAutoPlaying
  }

  /**
   * 主循环（基于requestAnimationFrame）
   * 职责：
   *  1. 如果正在过渡中 → 更新过渡进度
   *  2. 如果自动播放中 且 达到更新间隔 → 前进到下一关键帧
   */
  private loop = (): void => {
    const now: number = performance.now()

    if (this.isTransitioning) {
      this.updateTransition(now)
    } else if (this.isAutoPlaying && now - this.lastUpdateTime >= UPDATE_INTERVAL) {
      this.advanceToNextStep()
      this.lastUpdateTime = now
    }

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  /**
   * 自动模式：按STEP_MINUTES(15分钟)前进一步
   * 从20:00会循环回到6:00
   */
  private advanceToNextStep(): void {
    let nextTime: number = this.currentTime + STEP_MINUTES / 60
    if (nextTime >= END_HOUR) {
      nextTime = START_HOUR
    }
    this.beginTransition(this.currentTime, nextTime)
  }

  /**
   * 开始时间过渡动画
   * 记录起点和终点的时间与太阳位置，供updateTransition插值
   */
  private beginTransition(fromTime: number, toTime: number): void {
    this.transitionStartTime = performance.now()
    this.transitionFromTime = fromTime
    this.transitionToTime = toTime
    this.transitionFromSun = this.calculateSunPosition(fromTime)
    this.transitionToSun = this.calculateSunPosition(toTime)
    this.isTransitioning = true
  }

  /**
   * 每帧更新过渡进度（0.3秒内完成）
   * 使用 easeInOutCubic 缓动函数，使过渡平滑自然
   */
  private updateTransition(now: number): void {
    const elapsed: number = now - this.transitionStartTime
    const progress: number = Math.min(elapsed / TRANSITION_DURATION, 1)
    const t: number = this.easeInOutCubic(progress)

    this.currentTime = this.lerp(this.transitionFromTime, this.transitionToTime, t)
    this.currentSunPosition = {
      azimuth: this.lerp(this.transitionFromSun.azimuth, this.transitionToSun.azimuth, t),
      altitude: this.lerp(this.transitionFromSun.altitude, this.transitionToSun.altitude, t)
    }

    this.notifySubscribers()

    if (progress >= 1) {
      this.isTransitioning = false
      this.currentTime = this.transitionToTime
      this.currentSunPosition = { ...this.transitionToSun }
      this.notifySubscribers()
    }
  }

  /**
   * ============================================================
   *  太阳位置核心计算函数
   * ============================================================
   *
   *  输入: time (小时制，如 13.0 = 13:00)
   *  输出: { azimuth, altitude }
   *
   *  【方位角 azimuth 计算逻辑】
   *    1. normalized = (time - START_HOUR) / TOTAL_HOURS
   *       结果范围: 0.0 (6:00) ~ 1.0 (20:00)
   *    2. azimuth = AZIMUTH_MIN + normalized * AZIMUTH_RANGE
   *       = -90° + normalized * 180°
   *       结果: -90°(东) → 0°(南，正午) → +90°(西)
   *       ★ 上午为负，下午为正，关于正午13:00完全对称
   *
   *  【高度角 altitude 计算逻辑】
   *    使用正弦函数: sin(normalized * π)
   *    1. sin(0) = 0         → 6:00, 日出，altitude = 0°
   *    2. sin(π/2) = 1       → 13:00, 正午, altitude = 90°
   *    3. sin(π) = 0         → 20:00, 日落, altitude = 0°
   *    ★ 正弦曲线关于 π/2 (正午) 完全对称，上午9:30 = 下午16:30
   */
  private calculateSunPosition(time: number): SunPosition {
    const normalized: number = (time - START_HOUR) / TOTAL_HOURS

    const azimuth: number = AZIMUTH_MIN + normalized * AZIMUTH_RANGE
    const altitude: number = Math.sin(normalized * Math.PI) * 90

    return { azimuth, altitude }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => {
      callback(this.currentTime, { ...this.currentSunPosition })
    })
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}

export { TimeManager }
export const timeManager: TimeManager = new TimeManager()
export default timeManager
