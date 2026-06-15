import * as THREE from 'three';
import { ISceneManager } from '../engine/scene';

export interface IPlayerController {
  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  readonly scale: number;
  readonly collisionRadius: number;
  update(delta: number): void;
  takeDamage(amount: number): boolean;
  heal(amount: number): void;
  reset(): void;
  isShaking(): boolean;
  setCanyonBounds(halfWidth: number, minH: number, maxH: number): void;
  logDebugInfo(): void;
}

export class PlayerController implements IPlayerController {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public health: number;
  public maxHealth: number = 100;
  public readonly scale: number = 2.5;
  public readonly collisionRadius: number = 1.5;
  
  private scene: ISceneManager;
  private targetPosition: THREE.Vector3;
  private velocity: THREE.Vector3;
  private acceleration: number = 0;
  private maxSpeed: number = 2;
  private accelDuration: number = 0.3;
  private accelTimer: number = 0;
  private isMoving: boolean = false;
  
  private isDragging: boolean = false;
  private lastPointerPos: { x: number; y: number } = { x: 0, y: 0 };
  private sensitivity: number = 0.08;
  
  private shakeTime: number = 0;
  private shakeDuration: number = 0.2;
  private shakeIntensity: number = 5 * THREE.MathUtils.DEG2RAD;
  
  private canyonHalfWidth: number = 10;
  private minHeight: number = -3;
  private maxHeight: number = 12;
  
  private originalRotation: THREE.Euler;
  
  private leftWing: THREE.Mesh;
  private rightWing: THREE.Mesh;
  private wingFlapPhase: number = 0;
  
  private debugMode: boolean = true;
  private debugTimer: number = 0;

  constructor(sceneManager: ISceneManager) {
    this.scene = sceneManager;
    this.position = new THREE.Vector3(0, 3, 0);
    this.targetPosition = new THREE.Vector3(0, 3, 0);
    this.velocity = new THREE.Vector3();
    this.health = this.maxHealth;
    this.originalRotation = new THREE.Euler(0, 0, 0);
    
    this.mesh = this.createDragon();
    this.mesh.position.copy(this.position);
    this.mesh.scale.setScalar(this.scale);
    this.scene.addObject(this.mesh);
    
    this.setupInput();
    
    if (this.debugMode) {
      console.log('[PlayerController] 初始化完成');
      console.log(`  缩放比例: ${this.scale}, 碰撞半径: ${this.collisionRadius}`);
      console.log(`  初始位置: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
      this.logDebugInfo();
    }
  }

  private createDragon(): THREE.Group {
    const dragon = new THREE.Group();
    
    const bodyGeometry = new THREE.SphereGeometry(1, 8, 6);
    bodyGeometry.scale(1.2, 0.8, 1.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b5e20,
      metalness: 0.3,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    dragon.add(body);
    
    const headGeometry = new THREE.ConeGeometry(0.5, 1.2, 6);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x388e3c,
      metalness: 0.3,
      roughness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.2, -1.5);
    head.rotation.x = Math.PI / 2;
    head.castShadow = true;
    dragon.add(head);
    
    const eyeGeometry = new THREE.SphereGeometry(0.12, 6, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.25, 0.3, -2.0);
    dragon.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.25, 0.3, -2.0);
    dragon.add(rightEye);
    
    const wingGeometry = new THREE.BufferGeometry();
    const wingVertices = new Float32Array([
      0, 0, 0,
      3.0, 0, 0.6,
      1.8, -0.6, -1.2
    ]);
    const wingIndices = [0, 1, 2];
    wingGeometry.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
    wingGeometry.setIndex(wingIndices);
    wingGeometry.computeVertexNormals();
    
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.8,
      transparent: true,
      opacity: 0.9
    });
    
    this.leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    this.leftWing.position.set(-1.1, 0.3, 0.1);
    this.leftWing.rotation.z = -Math.PI / 6;
    dragon.add(this.leftWing);
    
    this.rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    this.rightWing.position.set(1.1, 0.3, 0.1);
    this.rightWing.rotation.y = Math.PI;
    this.rightWing.rotation.z = -Math.PI / 6;
    dragon.add(this.rightWing);
    
    const tailGeometry = new THREE.ConeGeometry(0.35, 2.5, 4);
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b5e20,
      metalness: 0.3,
      roughness: 0.7
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, -0.2, 2.2);
    tail.rotation.x = Math.PI / 3;
    tail.castShadow = true;
    dragon.add(tail);
    
    const backSpikeGeometry = new THREE.ConeGeometry(0.18, 0.6, 4);
    const backSpikeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      metalness: 0.4,
      roughness: 0.6
    });
    
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(backSpikeGeometry, backSpikeMaterial);
      spike.position.set(0, 0.75, -0.6 + i * 0.5);
      spike.castShadow = true;
      dragon.add(spike);
    }
    
    dragon.rotation.y = 0;
    
    if (this.debugMode) {
      console.log('[PlayerController] 飞龙模型朝向:');
      console.log(`  头部位置: (0, 0.2, -1.5) - 朝向Z负方向`);
      console.log(`  尾巴位置: (0, -0.2, 2.2) - 朝向Z正方向`);
      console.log(`  整体朝向: -Z方向 (屏幕深处)`);
    }
    
    return dragon;
  }

  private setupInput(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.isMoving = true;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      if (this.debugMode) {
        console.log('[PlayerController] 开始拖动输入');
      }
    });
    
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isMoving = false;
      this.accelTimer = 0;
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      
      this.targetPosition.x -= dx * this.sensitivity;
      this.targetPosition.y += dy * this.sensitivity;
      
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.isMoving = true;
        this.lastPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isDragging = false;
      this.isMoving = false;
      this.accelTimer = 0;
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.isDragging || e.touches.length === 0) return;
      
      const dx = e.touches[0].clientX - this.lastPointerPos.x;
      const dy = e.touches[0].clientY - this.lastPointerPos.y;
      
      this.targetPosition.x -= dx * this.sensitivity;
      this.targetPosition.y += dy * this.sensitivity;
      
      this.lastPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: false });
  }

  public update(delta: number): void {
    this.targetPosition.x = THREE.MathUtils.clamp(
      this.targetPosition.x,
      -this.canyonHalfWidth + 1.5,
      this.canyonHalfWidth - 1.5
    );
    this.targetPosition.y = THREE.MathUtils.clamp(
      this.targetPosition.y,
      this.minHeight,
      this.maxHeight
    );
    
    if (this.isMoving) {
      this.accelTimer += delta;
      const t = Math.min(this.accelTimer / this.accelDuration, 1);
      const easeIn = t * t;
      this.acceleration = easeIn * this.maxSpeed;
    } else {
      this.acceleration *= 0.9;
    }
    
    const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    const distance = direction.length();
    
    if (distance > 0.1) {
      direction.normalize();
      const moveSpeed = Math.min(this.acceleration, distance * 5);
      this.velocity.copy(direction.multiplyScalar(moveSpeed));
      this.position.add(this.velocity.clone().multiplyScalar(delta));
    }
    
    this.mesh.position.copy(this.position);
    
    const tiltAmount = (this.targetPosition.x - this.position.x) * 0.1;
    this.mesh.rotation.z = THREE.MathUtils.lerp(
      this.mesh.rotation.z,
      -tiltAmount * THREE.MathUtils.DEG2RAD * 30,
      0.1
    );
    
    const pitchAmount = (this.targetPosition.y - this.position.y) * 0.1;
    this.mesh.rotation.x = THREE.MathUtils.lerp(
      this.mesh.rotation.x,
      pitchAmount * THREE.MathUtils.DEG2RAD * 20,
      0.1
    );
    
    this.wingFlapPhase += delta * 6;
    const flapAngle = Math.sin(this.wingFlapPhase) * 0.35;
    this.leftWing.rotation.z = -Math.PI / 6 + flapAngle;
    this.rightWing.rotation.z = -Math.PI / 6 - flapAngle;
    
    if (this.shakeTime > 0) {
      this.shakeTime -= delta;
      const shakeProgress = this.shakeTime / this.shakeDuration;
      const shake = Math.sin(this.shakeTime * 50) * this.shakeIntensity * shakeProgress;
      this.mesh.rotation.z += shake;
    }
    
    if (this.debugMode) {
      this.debugTimer += delta;
      if (this.debugTimer > 5) {
        this.debugTimer = 0;
        this.logDebugInfo();
      }
    }
  }

  public takeDamage(amount: number): boolean {
    this.health = Math.max(0, this.health - amount);
    this.shakeTime = this.shakeDuration;
    if (this.debugMode) {
      console.log(`[PlayerController] 受到伤害: -${amount}, 当前生命值: ${this.health}`);
    }
    return this.health <= 0;
  }

  public heal(amount: number): void {
    const oldHealth = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (this.debugMode) {
      console.log(`[PlayerController] 恢复生命: +${amount}, ${oldHealth.toFixed(0)} -> ${this.health.toFixed(0)}`);
    }
  }

  public reset(): void {
    this.health = this.maxHealth;
    this.position.set(0, 3, 0);
    this.targetPosition.set(0, 3, 0);
    this.velocity.set(0, 0, 0);
    this.shakeTime = 0;
    this.accelTimer = 0;
    this.isMoving = false;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.setScalar(this.scale);
    if (this.debugMode) {
      console.log('[PlayerController] 重置完成');
    }
  }

  public isShaking(): boolean {
    return this.shakeTime > 0;
  }

  public setCanyonBounds(halfWidth: number, minH: number, maxH: number): void {
    this.canyonHalfWidth = halfWidth;
    this.minHeight = minH;
    this.maxHeight = maxH;
    if (this.debugMode) {
      console.log(`[PlayerController] 峡谷边界更新: 半宽=${halfWidth}, 高度范围=${minH}~${maxH}`);
    }
  }

  public logDebugInfo(): void {
    console.log('[PlayerController] 调试信息:');
    console.log(`  位置: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`);
    console.log(`  目标位置: (${this.targetPosition.x.toFixed(2)}, ${this.targetPosition.y.toFixed(2)})`);
    console.log(`  生命值: ${this.health.toFixed(0)}/${this.maxHealth}`);
    console.log(`  移动中: ${this.isDragging}, 加速度: ${this.acceleration.toFixed(2)}`);
    console.log(`  边界限制: X: [-${this.canyonHalfWidth}, ${this.canyonHalfWidth}], Y: [${this.minHeight}, ${this.maxHeight}]`);
    
    const box = new THREE.Box3().setFromObject(this.mesh);
    console.log(`  模型包围盒: (${box.min.x.toFixed(1)}, ${box.min.y.toFixed(1)}, ${box.min.z.toFixed(1)}) -> (${box.max.x.toFixed(1)}, ${box.max.y.toFixed(1)}, ${box.max.z.toFixed(1)})`);
  }
}
