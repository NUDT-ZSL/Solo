import * as THREE from 'three';

/**
 * 光照控制器 - 管理场景中的动态光照效果
 *
 * 功能: 模拟日夜循环的光照变化，包括太阳位置、颜色、强度
 * 包含平行光（主光源）和环境光（全局照明）
 *
 * 数据流向:
 * main.ts 每帧调用 update()
 * → 根据 elapsedTime 计算时间参数
 * → 更新 DirectionalLight 的位置、颜色、强度
 * → 更新 AmbientLight 的强度
 * → Three.js 渲染器在渲染时使用这些光照数据
 */
export class LightingController {
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private scene: THREE.Scene;

  /**
   * 构造函数 - 初始化光照系统
   * @param scene - Three.js 场景对象，用于添加光源
   *
   * 创建三盏灯:
   * 1. DirectionalLight - 主光源，模拟太阳光
   * 2. AmbientLight - 环境光，提供基础照明
   * 3. 辅助 DirectionalLight - 补光，增加层次感
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.directionalLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this.directionalLight.position.set(50, 80, 30);
    this.directionalLight.castShadow = false;
    scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(this.ambientLight);

    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-30, 20, -50);
    scene.add(fillLight);
  }

  /**
   * 每帧更新光照状态
   * @param elapsedTime - 自场景启动以来的总时间（秒）
   *
   * 模拟日夜循环:
   * - 使用正弦函数计算 timeOfDay (0~1)
   * - 根据时间插值太阳颜色和强度
   * - 更新太阳位置（日出→正午→日落→夜晚）
   *
   * 四个阶段:
   * 1. 黎明 (0-0.2): 夜晚→日出橙色
   * 2. 上午 (0.2-0.5): 日出→正午白色
   * 3. 下午 (0.5-0.8): 正午→日落红色
   * 4. 夜晚 (0.8-1.0): 日落→深蓝夜空
   *
   * 数据流向:
   * main.ts 动画循环 → update(elapsedTime)
   * → 计算太阳位置/颜色/强度
   * → 写入 directionalLight 和 ambientLight 属性
   * → Three.js 渲染器使用
   */
  update(elapsedTime: number): void {
    const cycleSpeed = 0.02;
    const timeOfDay = (Math.sin(elapsedTime * cycleSpeed) + 1) / 2;

    const sunAngle = timeOfDay * Math.PI;
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.sin(sunAngle) * 80 + 10;
    const sunZ = 30;

    this.directionalLight.position.set(sunX, Math.max(sunY, -20), sunZ);

    const dawnColor = new THREE.Color(0xff8844);
    const noonColor = new THREE.Color(0xffffff);
    const duskColor = new THREE.Color(0xff6633);
    const nightColor = new THREE.Color(0x223355);

    let sunColor: THREE.Color;
    let intensity: number;
    let ambientIntensity: number;

    if (timeOfDay < 0.2) {
      const t = timeOfDay / 0.2;
      sunColor = nightColor.clone().lerp(dawnColor, t);
      intensity = 0.3 + t * 0.7;
      ambientIntensity = 0.2 + t * 0.3;
    } else if (timeOfDay < 0.5) {
      const t = (timeOfDay - 0.2) / 0.3;
      sunColor = dawnColor.clone().lerp(noonColor, t);
      intensity = 1.0 + t * 0.5;
      ambientIntensity = 0.5 + t * 0.3;
    } else if (timeOfDay < 0.8) {
      const t = (timeOfDay - 0.5) / 0.3;
      sunColor = noonColor.clone().lerp(duskColor, t);
      intensity = 1.5 - t * 0.7;
      ambientIntensity = 0.8 - t * 0.4;
    } else {
      const t = (timeOfDay - 0.8) / 0.2;
      sunColor = duskColor.clone().lerp(nightColor, t);
      intensity = 0.8 - t * 0.5;
      ambientIntensity = 0.4 - t * 0.2;
    }

    this.directionalLight.color.copy(sunColor);
    this.directionalLight.intensity = intensity;
    this.ambientLight.intensity = ambientIntensity;
  }

  /**
   * 获取主方向光
   * @returns Three.js DirectionalLight 对象
   *
   * 供外部模块访问方向光属性
   */
  getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  /**
   * 释放所有光照资源
   * 从场景中移除所有光源
   */
  dispose(): void {
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.ambientLight);
  }
}
